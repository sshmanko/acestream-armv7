function reload_broadcast_list(playlist_id) {
    var external_playlist_id;
    if(playlist_id === undefined) {
        external_playlist_id = $("#broadcasting-filter-external-playlist-id").val();
    }
    else {
        external_playlist_id = playlist_id;
        $("#broadcasting-filter-external-playlist-id option[value='"+playlist_id+"']").prop('selected', true);
    }
    var filter_status = $("#filter-status").val();

    sendRequest({
        method: "broadcast_list_get",
        external_playlist_id: external_playlist_id,
        status: filter_status
        },
        // onsuccess
        function(response) {
            show_broadcast_list(response.broadcast_list);
        },
        // onfailure
        function(error) {
            showNotification(error, 5);
        }
    );
}

function clear_broadcast_list()
{
    if(window.confirm(__('clear-broadcast-list-confirm'))) {
        if(window.confirm(__('recover-impossible-confirm'))) {
            sendRequest({
                method: "broadcast_list_clear",
                },
                // onsuccess
                function(response) {
                    reload_broadcast_list();
                }
            );
        }
    }
}

function delete_broadcast_list_item(infohash)
{
    if(!window.confirm(__('del-broadcast-confirm'))) {
        return false;
    }
    sendRequest({
            method: "broadcast_list_delete_item",
            infohash: infohash
            },
            // onsuccess
            function(response) {
                reload_broadcast_list();
            }
        );
    return true;
}

function export_selected_broadcast_list_items()
{
    var ids = [], $selector = $(".broadcast-list-check-item:checked");

    if($selector.size() == 0) {
        window.alert(__('nothing-selected'));
        return false;
    }

    $selector.each(function() {
            ids.push($(this).val());
    });

    var export_url = location.protocol + "//" + location.host + "/server/api?method=export_my_broadcasts&token=" + params.access_token + "&ids=" + ids.join(",");
    window.open(export_url);

    return true;
}

function show_broadcast_list_item(infohash)
{
    sendRequest({
            method: "broadcast_list_show_item",
            infohash: infohash
            }
        );
    return true;
}

function show_broadcast_list(data)
{
    if(data.length == 0) {
        $("#broadcast_list").empty().html(__('broadcast-list-empty'));
        return;
    }

    var html = '<table class="table table-bordered table-striped" cellspacing="0" cellpadding="0" border="0"><tr>';
    html += '<th>#</th>';
    html += '<th style="text-align: left;"><input type="checkbox" value="1" style="margin: 0;" id="broadcast-list-check-all" /></th>';
    html += '<th>' + __('status') + '</th>';
    html += '<th>' + __('type') + '</th>';
    html += '<th>' + __('title') + ' / ' + __('content-id') + '</th>';
    html += '<th>' + __('path') + '</th>';
    html += '<th>&nbsp;</th>';
    html += '</tr>';
    for(var i=0; i < data.length; i++) {
        var status, content_id;
        var type_names = {
            'p2p': 'P2P',
            'hls': 'HLS+P2P'
        };

        if(data[i].type == "p2p")
            status = "-";
        else if(data[i].is_alive === undefined || data[i].is_alive === 0)
            status = "?";
        else if(data[i].is_alive === 1)
            status = __('alive');
        else
            status = __('dead');

        if(data[i].content_id === undefined || data[i].content_id === null)
            content_id = null;
        else
            content_id = data[i].content_id;

        html += '<tr>';
        html += '<td>'+(i+1)+'</td>';
        html += '<td><input type="checkbox" value="'+data[i].infohash+'" class="broadcast-list-check-item" /></td>';
        html += '<td>'+status+'</td>';
        html += '<td>'+type_names[data[i].type]+'</td>';
        html += '<td class="break">';
        html += data[i].title;
        if(content_id) {
            html += '<br/>' + content_id;
        }
        html += '</td>';
        html += '<td class="break with-icon"><span>'+(data[i].path ? data[i].path : "") +'</span>';
        //html += '<a href="#" onclick="show_broadcast_list_item(&quot;'+data[i].infohash+'&quot;); return false;" title="' + __('show') + '"><i class="icon icon-folder-open"></i></a>';
        html += '</td>';

        html += '<td>';
        if(data[i].external_playlist_id !== undefined && data[i].external_playlist_id < 0) {
            html += '<a href="#" style="text-decoration:none;color:black;" onclick="delete_broadcast_list_item(&quot;'+data[i].infohash+'&quot;); return false;" title="' + __('delete') + '"><i class="icon icon-remove"></i></a>';
        }
        html += '</td>';
        html += '</tr>';
    }
    html += '</table>';
    $("#broadcast_list").html(html);

    $("#broadcast-list-check-all").change(function() {
            var checked = $(this).is(":checked");
            $(".broadcast-list-check-item").prop("checked", checked);
    });

    $(".broadcast-list-check-item").change(function() {
            if($(this).is(":checked")) {
                $("#broadcast-list-check-all").prop("checked", true);
            }
            else {
                $("#broadcast-list-check-all").prop("checked", $(".broadcast-list-check-item:checked").size() > 0);
            }
    });
}

function view_external_hls_playlist(playlist_id) {
    reload_broadcast_list(playlist_id);
    show_page("broadcasting-my-broadcasts");
}

function reload_external_hls_playlists() {
    var request = {
        method: "external_playlist_get",
        type: "broadcast"
        };

    sendRequest(request,
        // onsuccess
        function(response) {
            show_external_hls_playlist(response.playlist);
        },
        // onfailure
        function(error) {
            showNotification(error, 5);
        }
    );
}

function show_external_hls_playlist(data)
{
    if(data.length == 0) {
        $("#external-hls-playlists").empty().html(__('no-ext-playlists'));
        return;
    }

    var $filter = $("#broadcasting-filter-external-playlist-id");
    $filter.empty();
    $filter.append('<option value="-2">' + __('show-all') + '</option>');
    $filter.append('<option value="-1">' + __('show-manually-added') + '</option>');

    var html = '<table class="table table-bordered table-striped" cellspacing="0" cellpadding="0" border="0"><tr>';
    html += '<th>' + __('name') + '</th>';
    html += '<th>' + __('url') + '</th>';
    html += '<th>' + __('last-updated') + '</th>';
    html += '<th>&nbsp;</th>';
    html += '</tr>';
    for(var i=0; i < data.length; i++) {
        html += '<tr>';
        html += '<td>'+data[i].name+'</td>';
        html += '<td>'+data[i].url+'</td>';

        var last_update;
        if(data[i].last_update === undefined || data[i].last_update === null) {
            last_update = "-";
        }
        else {
            last_update = strftime('%F %T', new Date(parseInt(data[i].last_update * 1000)));
        }

        html += '<td>'+last_update+'</td>';
        html += '<td>';
        html += '<a href="#" style="text-decoration:none;color:black;" onclick="update_external_hls_playlist('+data[i].id+'); return false;" title="' + __('update') + '"><i class="icon icon-refresh"></i></a>';
        html += ' <a href="#" style="text-decoration:none;color:black;" onclick="view_external_hls_playlist('+data[i].id+'); return false;" title="' + __('view-playlist') + '"><i class="icon icon-eye-open"></i></a>';
        html += ' <a href="#" style="text-decoration:none;color:black;" onclick="delete_external_hls_playlist('+data[i].id+'); return false;" title="' + __('delete') + '"><i class="icon icon-remove"></i></a>';
        html += '</td>';
        html += '</tr>';
        $filter.append('<option value="'+data[i].id+'">'+data[i].name+'</option>');
    }
    html += '</table>';
    $("#external-hls-playlists").html(html);
}

function delete_external_hls_playlist(playlist_id)
{
    if(!window.confirm(__('del-ext-playlist-confirm-wide'))) {
        return false;
    }
    sendRequest({
            method: "external_playlist_delete",
            id: playlist_id
            },
            // onsuccess
            function(response) {
                reload_external_hls_playlists();
                reload_broadcast_list();
                reload_playlist();
                reload_playlist_trash();
            }
        );
    return true;
}

function update_external_hls_playlist(playlist_id)
{
    sendRequest({
            method: "external_playlist_update",
            id: playlist_id
            }
        );
    return true;
}
