function update_subcategories()
{
    var category = $("#filter-category").val(),
        $container = $("#filter-subcategory"),
        subcategory = $container.val();

    if(category == "_all_") {
        $container.empty();
        $container.append('<option value="_all_" class="translate" data-string-id="show-all">' + __('show-all') + '</option>');
    }
    else {
        sendRequest({
                method: "get_subcategories",
                owner: params.current_media_owner,
                category: category,
            },
            // onsuccess
            function(response) {
                $container.empty();
                $container.append('<option value="_all_">' + __('show-all') + '</option>');

                var $item = $('<option value="_favorite_">' + __('favorite') + '</option>');
                if(subcategory == "_favorite_") {
                    $item.prop("selected", true);
                }
                $container.append($item);

                for(var i=0; i < response.length; i++) {
                    var item = response[i];
                    var $item = $('<option value="'+item+'">'+item+'</option>');
                    if(item == subcategory) {
                        $item.prop("selected", true);
                    }
                    $container.append($item);
                }
            }
            );
    }
}

function update_subcategories_cache_for_current_category() {
    update_subcategories_cache($("#playlist-add-item-category").val());
}

function update_subcategories_cache(category) {
    if(!category) {
        return;
    }
    if(category === "_all_") {
        return;
    }
    sendRequest({
            method: "get_subcategories",
            owner: params.current_media_owner,
            category: category,
        },
        // onsuccess
        function(response) {
            if(response && response.length) {
                subcategory_cache[category] = response;
            }
        }
    );
}

function add_external_playlist()
{
    var category = $("#add-external-playlist-category").val(),
        name = $("#add-external-playlist-name").val().trim(),
        url = $("#add-external-playlist-url").val().trim(),
        update_interval = $("#add-external-playlist-update-interval").val(),
        mode = $("#playlist-upload-form").data("mode"),
        playlist_id = $("#playlist-upload-form").data("playlist-id");

    if(name.length == 0) {
        alert("Empty name");
        return false;
    }
    if(url.length == 0) {
        alert("Empty url");
        return false;
    }
    if(!/^https?:\/\//.test(url)) {
        alert("URL must start with http:// or https://");
        return false;
    }

    var params = {
        type: "content",
        category: category,
        name: name,
        update_interval: update_interval
    };

    if(mode == "edit") {
        params['method'] = "external_playlist_edit";
        params['id'] = playlist_id;
    }
    else {
        params['method'] = "external_playlist_add";
        // url cannot be changed in edit mode (sync limitations)
        params['url'] = url;
    }

    sendRequest(
        params,
        // onsuccess
        function(response) {
            $("#add-external-playlist-name").val("");
            $("#add-external-playlist-url").val("");
            reload_external_playlists();
            if(mode == "add") {
                show_page("proxy-server-playlist");
            }
            else if(mode == "edit") {
                show_page("proxy-server-imported-playlists");
            }
        },
        // failure
        function(error) {
            showNotification(error, 5)
        }
    );
}

function edit_external_playlist(playlist_id)
{
    sendRequest(
        {
            method: "external_playlist_get",
            id: playlist_id,
        },
        // onsuccess
        function(response) {
            $("#add-external-playlist-name").val(response.name);
            $("#add-external-playlist-url").val(response.url);
            $("#add-external-playlist-category option[value='"+response.category+"']").prop('selected', true);
            $("#add-external-playlist-update-interval option[value='"+response.interval+"']").prop('selected', true);

            show_page("media-server-edit-playlist", {
                params: {
                    playlist_id: playlist_id
                }
            });
        },
        // failure
        function(error) {
            showNotification(error, 5)
        }
    );


}

function playlist_add_item_form_submit()
{
    var file = $("#playlist-add-item-file").val() || "";
    if(file.length == 0) {
        // send ajax request
        add_playlist_item();
    }
    else {
        // post form
        backgroundTaskSuppressErrors = true;
        $("#playlist-add-item-form").submit();
    }
}

function add_playlist_item2(details)
{
    showNotification(__('adding-new-item'), 10);
    sendRequest({
            method: "playlist_add_item",
            id: details.content_id,
            infohash: details.infohash,
            url: details.transport_file_url,
            title: details.title,
            category: details.category,
            subcategory: details.subcategory,
            auto_search: details.auto_search,
            hls_manifest_url: details.hls_manifest_url,
            video_url: details.video_url,
            },
            // onsuccess
            function(response) {
                showNotification(__('item-added'), 5);
                update_subcategories_cache_for_current_category();
                if(typeof details.onsuccess === 'function') {
                    details.onsuccess.call(null);
                }
            },
            // onfailure
            function(error) {
                showNotification(error, 5);
            }
        );
    return true;
}

function add_playlist_item(onsuccess)
{
    var title = $("#playlist-add-item-title").val(),
        hls_manifest_url = $("#playlist-add-item-hls-manifest-url").val(),
        video_url = $("#playlist-add-item-video-url").val();

    var details = {
        content_id: $("#playlist-add-item-content-id").val(),
        infohash: $("#playlist-add-item-infohash").val(),
        transport_file_url: $("#playlist-add-item-transport-file-url").val(),
        title: title,
        category: $("#playlist-add-item-category").val(),
        subcategory: $("#playlist-add-item-subcategory").val(),
        auto_search: false,
        hls_manifest_url: hls_manifest_url,
        video_url: video_url,
        onsuccess: function() {
            $("#playlist-add-item-content-id").val("");
            $("#playlist-add-item-infohash").val("");
            $("#playlist-add-item-title").val("");
            $("#playlist-add-item-subcategory").val("");
            $("#playlist-add-item-transport-file-url").val("");
            $("#playlist-add-item-hls-manifest-url").val("");
            $("#playlist-add-item-video-url").val("");
            reload_playlist();
            show_page("proxy-server-playlist");
            if(typeof onsuccess === 'function') {
                onsuccess.call(null);
            }
        }
    };

    if(title.length == 0) {
        if(hls_manifest_url.length) {
            // need title for direct HLS
            alert(__('missing-title'));
            return false;
        }

        if(video_url.length) {
            // need title, try to get from OpenGraph
            showNotification(__('fetching-metadata'), 10);
            sendRequest({
                method: "get_og_metadata",
                url: video_url
            },
                // onsuccess
                function(response) {
                    if(response && response.title) {
                        details.title = response.title;
                        $("#playlist-add-item-title").val(response.title);
                        showNotification(__('got-metadata'), 5);

                        add_playlist_item2(details);
                    }
                    else {
                        hideNotification();
                        alert(__('missing-title'));
                    }
                },
                // onfailure
                function(error) {
                    showNotification(error, 5);
                    alert(__('missing-title'));
                }
                );
            return true;
        }
    }

    add_playlist_item2(details);
    return true;
}

function delete_playlist_item(item_id)
{
    if(!window.confirm(__('del-item-confirm'))) {
        return false;
    }
    sendRequest({
            method: "playlist_delete_item",
            id: item_id,
            owner: params.current_media_owner
            },
            // onsuccess
            function(response) {
                reload_playlist();
                reload_playlist_trash();
            }
        );
    return true;
}

function download_playlist_item(item_id)
{
    var url = get_playback_url(item_id);
    if(!url) {
        alert(__('download-failed'));
        return;
    }

    window.open(url + "?mode=download");
}

function get_playback_url(item_id) {
    return "http://"+params.host+"/play/"+params.playlist_id+"/"+item_id;
}

function get_playback_url_for_infohash(infohash) {
    return "http://"+params.host+"/play/infohash/"+infohash;
}

function restore_playlist_item(item_id)
{
    if(!window.confirm(__('restore-item-confirm'))) {
        return false;
    }
    sendRequest({
            method: "playlist_restore_item",
            id: item_id,
            owner: params.current_media_owner
            },
            // onsuccess
            function(response) {
                reload_playlist();
                reload_playlist_trash();
            }
        );
    return true;
}

function delete_selected_playlist_items()
{
    var ids = [], $selector = $(".playlist-check-item:checked");

    if($selector.size() == 0) {
        window.alert("Nothing selected");
        return false;
    }

    if(!window.confirm(__('del-sel-items-confirm'))) {
        return false;
    }
    $selector.each(function() {
            ids.push($(this).val());
    });

    sendRequest({
            method: "playlist_delete_items",
            ids: ids.join(","),
            owner: params.current_media_owner
            },
            // onsuccess
            function(response) {
                reload_playlist();
                reload_playlist_trash();
            }
        );
    return true;
}

function render_epg_list(items) {
    var html = [];

    html.push('<table class="epg-table">');
    for(var i=0, len=items.length; i < len; i++) {
        var item = items[i];
        if(item.title) {
            var start = moment.unix(item.start),
                stop = moment.unix(item.stop),
                now = moment();

            html.push('<tr><td class="time">' + start.format("HH:mm") + '</td><td>'+item.title+'</td></tr>');
        }
    }
    html.push('</table>');

    return html.join("");
}

function get_epg(item_id, channel_name) {
    var now = moment().unix();
    sendRequest({
            method: "get_epg_by_item_id",
            id: item_id,
            min_stop: now,
            max_start: now + 12*3600,
            },
            // onsuccess
            function(response) {
                if(response && response[item_id]) {
                    open_epg_popup(channel_name, render_epg_list(response[item_id]));
                }
            },
            // onerror
            function(error) {
                console.log("get_epg: error: " + error);
            }
        );
}

function reload_media_count()
{
    sendRequest({
        method: "get_media_count",
        },
        // onsuccess
        function(response) {
            function add(title, count) {
                var $a1 = $('<a data-string-id="'+title+'" data-string-suffix=" ('+count+')" href="#proxy-server-playlist" class="item level2 show-page translate">' + __(title) + ' (' + count + ')</a>');
                $a1.on("click", function() {
                    $("#filter-category option[value='"+title+"']").prop('selected', true);
                    reload_playlist();
                    set_search_type("local");
                });
                $container1.append($a1);

                var $a2 = $('<li><a data-string-id="'+title+'" data-string-suffix=" ('+count+')" href="#proxy-server-playlist" class="show-page translate">' + __(title) + ' (' + count  + ')</a></li>');
                $a2.on("click", function() {
                    $("#filter-category option[value='"+title+"']").prop('selected', true);
                    reload_playlist();
                    set_search_type("local");
                });
                $container2.append($a2);
            }
            var $container1 = $(".quick-nav-my-playlists"),
                $container2 = $(".sidebar-my-playlists");

            $container1.empty();
            $container2.empty();

            var found = false,
                categories = ["tv", "movies", "music_video", "music", "other"];
            for(var i=0; i<categories.length; i++) {
                var cat = categories[i];
                if(response[cat] > 0) {
                    found = true;
                    add(cat, response[cat]);
                }
            }

            // "My playlists" link must be active when playlist is empty
            if(found) {
                $(".my-playlists-header").show();
                $(".my-playlists-link").hide();
            }
            else {
                $(".my-playlists-header").hide();
                $(".my-playlists-link").show();
            }

            params.media_count = response;
            reload_playlist_url();
        }
    );
}

function reload_playlist(details) {
    var external_playlist_id,
        name = $("#filter-name").val(),
        category = $("#filter-category").val(),
        subcategory = $("#filter-subcategory").val();

    // always reload media count when reloading playlist
    reload_media_count();

    details = details || {};

    if(details.playlist_id === undefined) {
        external_playlist_id = $("#filter-external-playlist-id").val();
    }
    else {
        external_playlist_id = details.playlist_id;
        $("#filter-external-playlist-id option[value='"+details.playlist_id+"']").prop('selected', true);
    }

    if(category == "_all_") {
        category = "";
    }

    if(details.page_size === undefined) {
        details.page_size = 25;
    }
    if(details.page === undefined) {
        details.page = 0;
    }
    var request = {
        method: "playlist_get",
        name: name,
        category: category,
        external_playlist_id: external_playlist_id,
        sort: 1,
        offset: details.page*details.page_size,
        limit: details.page_size
        };

    if(subcategory) {
        if(subcategory == "_all_") {
            // pass
        }
        else if(subcategory == "_favorite_") {
            request['is_favorite'] = 1;
        }
        else {
            request['subcategory'] = subcategory;
        }
    }

    sendRequest(request,
        // onsuccess
        function(response) {
            show_playlist(response.playlist, response.total_items, details.page, details.page_size, details.scroll);
        },
        // onfailure
        function(error) {
            showNotification(__("playlist-load-failed-try-again-later"), 5);
        }
    );
    update_subcategories();
}

function findPos(obj) {
    var curtop = 0;
    if (obj.offsetParent) {
        do {
            curtop += obj.offsetTop;
        } while (obj = obj.offsetParent);
    return [curtop];
    }
}

function show_playlist(data, total_items, page, page_size, scroll)
{
    var allow_remote_access = !!$("#allow_remote_access").is(":checked"),
        allow_intranet_access = !!$("#allow_intranet_access").is(":checked");

    if(scroll) {
        // 65 - sticky top bar height
        var pos = findPos(document.getElementById("playlist"));
        window.scroll(0, pos-65);
    }

    if(data.length == 0) {
        $("#playlist").empty().html(__('playlist-empty'));
        return;
    }

    var html = '<table class="table table-bordered table-striped" cellspacing="0" cellpadding="0" border="0"><tr>';
    html += '<th style="text-align: left;"><input type="checkbox" value="1" id="playlist-check-all" /></th>';
    html += '<th><span class="translate" data-string-id="media">' + __('media') + '</span>&nbsp;/&nbsp;<span class="translate" data-string-id="category">' + __('category') + '</span></th>';

    html += '<th width="95%">';
    html += '<span class="translate" data-string-id="title">' + __('title') + '</span>';
    html += '&nbsp;/&nbsp;<span class="translate" data-string-id="description">' + __('description') + '</span>';
    html += '</th>';

    html += '<th><span class="translate" data-string-id="auto-search">' + __('auto-search') + '</span></th>';

    html += '<th><span class="translate" data-string-id="play">' + __('play') + '</span>&nbsp;/&nbsp;<span class="translate" data-string-id="delete">' + __('delete') + '</span></th>';
    html += '</tr>';

    for(var i=0; i < data.length; i++) {
        if(!data[i].category) {
            data[i].category = "other";
        }

        html += '<tr class="playlist-item-row" data-item-id="'+data[i].id+'" id="playlist-item-row-'+data[i].id+'">';
        html += render_playlist_item_row(data[i]);
        html += '</tr>';
    }
    html += '</table>';

    // pagination
    var count_pages = Math.ceil(total_items / page_size);
    if(count_pages > 1) {
        html += '<div class="playlist-pagination" style="margin-top: 10px;">';

        if(count_pages <= 3) {
            // show just page numbers
            for(var i=0; i < count_pages; i++) {
                if(i === page) {
                    html += '<a href="#" class="btn btn-info" onclick="return false;">' + (i+1) + '</a> ';
                }
                else {
                    html += '<a href="#" class="btn btn-info white" onclick="reload_playlist({page:'+i+', scroll:true}); return false;">' + (i+1) + '</a> ';
                }
            }
        }
        else {
            // first
            html += '<a href="#" class="btn btn-info white" onclick="reload_playlist({page:0, scroll:true}); return false;">&lt;&lt;</a> ';
            // prev
            html += '<a href="#" class="btn btn-info white" onclick="reload_playlist({page:'+Math.max(0, page-1)+', scroll:true}); return false;">&lt;</a> ';

            var start = Math.max(page-2, 0),
                end = Math.min(page+2, count_pages-1);

            start = Math.max(0, Math.min(start, end-4));
            end = Math.min(count_pages-1, Math.max(end, start+4));

            for(var i=start; i <= end; i++) {
                if(i === page) {
                    html += '<a href="#" class="btn btn-info" onclick="return false;">' + (i+1) + '</a> ';
                }
                else {
                    html += '<a href="#" class="btn btn-info white" onclick="reload_playlist({page:'+i+', scroll:true}); return false;">' + (i+1) + '</a> ';
                }
            }

            // last page number
            if(end < count_pages-2) {
                html += '<a href="#" class="btn btn-info white" onclick="return false;">...</a> ';
            }
            if(end < count_pages-1) {
                html += '<a href="#" class="btn btn-info white" onclick="reload_playlist({page:'+(count_pages-1)+', scroll:true}); return false;">' + count_pages + '</a> ';
            }

            // next
            html += '<a href="#" class="btn btn-info white" onclick="reload_playlist({page:'+Math.min(page+1, count_pages-1)+', scroll:true}); return false;">&gt;</a> ';
            // last
            html += '<a href="#" class="btn btn-info white" onclick="reload_playlist({page:'+(count_pages-1)+', scroll:true}); return false;">&gt;&gt;</a>';
        }

        html += '</div>';
    }

    // update html
    $("#playlist").html(html);

    // reinit clipboard
    if(playlist_clipboard_) {
        playlist_clipboard_.destroy();
    }
    playlist_clipboard_ = new Clipboard('.clipboard-trigger-a', {
        text: function(trigger) {
            var $item = $($(trigger).data("target-selector"));
            return $item.attr("href") || $item.val() || $item.text();
        }
    });
}

function render_playlist_item_row(playlist_item)
{
    var url, title;
    var type_names = {
        'live': 'Live',
        'vod': 'VOD'
    };

    // wrap on a period
    title = playlist_item.title.replace(/\./g, '.<wbr>');

    var html = "";

    html += '<td><input type="checkbox" value="'+playlist_item.id+'" class="playlist-check-item" /></td>';

    // category/favorite
    html += '<td style="position: relative;">';
    html += __(playlist_item.category.toLowerCase());
    if(playlist_item.tags && playlist_item.tags.length) {
        // tags
        for(var i=0; i<playlist_item.tags.length; i++) {
            html += '<br/>';
            html += playlist_item.tags[i];
        }
    }
    else if(playlist_item.categories && playlist_item.categories.length) {
        // categories from EPG database
        html += '<br/>';
        html += playlist_item.categories.join(" / ");
    }
    html += '</td>';

    // icon/description
    html += '<td>';
    html += '<table class="hidden-table" cellspacing="0" cellpadding="0"><tr>';
    html += '<td style="min-width: 50px; vertical-align: middle;">';
    if(playlist_item.icons && playlist_item.icons.length) {
        html += '<img src="'+playlist_item.icons[0].url+'" />';
    }
    else if(playlist_item.poster) {
        html += '<img src="/server/api?method=get_image&url='+encodeURIComponent(playlist_item.poster)+'" />';
    }
    html += '</td>';

    html += '<td width="95%">';
    html += '<span style="font-size: 16px;">' + title + '</span>';

    // show infohash/content_id in debug mode
    if(params.debug_webui_client) {
        html += '<div>infohash: ' + playlist_item.infohash + '</div>';
        html += '<div>cid: ' + playlist_item.content_id + '</div>';
        html += '<div>hash: ' + playlist_item.hash + '</div>';
        html += '<div>ctype: ' + playlist_item.content_type + '</div>';
        html += '<div>is_live: ' + playlist_item.is_live + '</div>';
        html += '<div>created at: ' + moment.unix(playlist_item.created_at).format("YYYY-MM-DD HH:mm") + '</div>';
        html += '<div>updated at: ' + moment.unix(playlist_item.updated_at).format("YYYY-MM-DD HH:mm") + '</div>';
        if(playlist_item.last_auto_search_data) {
            html += '<div>autosearch data: ' + JSON.stringify(playlist_item.last_auto_search_data) + '</div>';
        }
    }

    if(playlist_item.epg && playlist_item.epg.length) {
        html += '<br/>';
        var now = moment();
        var start = moment.unix(playlist_item.epg[0].start);
        var stop = moment.unix(playlist_item.epg[0].stop);

        var secondsPlayed = moment.duration(now.diff(start)).asSeconds();
        var totalSeconds = playlist_item.epg[0].stop - playlist_item.epg[0].start;
        var playedPercent = Math.round(secondsPlayed / totalSeconds * 100);

        html += start.format("HH:mm") + " - ";
        html += stop.format("HH:mm") + " ";
        html += playlist_item.epg[0].title;
        html += '<div style="position: relative; width: 200px; height: 10px; background-color: #ccc;">';
        html += '<div style="position: absolute; left: 0; top: 0; width: '+playedPercent+'%; height: 100%; background-color: #80AFCA;"></div>';
        html += '</div>';
    }
    html += '</td>'

    // favorite button
    html += '<td style="text-align: right; vertical-align: middle;">';
    html += '<a href="#" style="display: inline-block; padding-top: 8px; color: #888;" class="action-toggle-favorite" data-playlist-item-id="' + playlist_item.id + '" data-is-favorite="' + (playlist_item.is_favorite ? "yes" : "no") + '">';
    if(playlist_item.is_favorite) {
        html += '<i class="material-icons">favorite</i>';
    }
    else {
        html += '<i class="material-icons">favorite_border</i>';
    }
    html += '</a>';
    html += '</td>';

    if(playlist_item.epg && playlist_item.epg.length) {
        // epg button
        html += '<td style="text-align: right; vertical-align: middle;">'
        html += '<a href="#" class="btn btn-info white" onclick="get_epg('+playlist_item.id+', \''+playlist_item.title.replace(/'/g, "&#39;")+'\'); return false;" title="' + __('show-epg') + '">EPG</a>';
        html += '</td>';
    }

    html += '</tr></table>';
    html += '</td>';

    // auto search button
    html += '<td style="text-align: center; vertical-align: middle;">'
    if(playlist_item.show_autosearch) {
        html += '<input type="button" class="btn btn-info white action-toggle-auto-search" data-playlist-item-id="'+playlist_item.id+'" data-auto-search="'+(playlist_item.auto_search ? "on" : "off")+'" value="'+(playlist_item.auto_search ? "ON" : "OFF")+'" />';
    }
    html += '</td>';

    html += '<td style="text-align: right; vertical-align: middle; white-space: nowrap; min-width: 250px;" class="playlist-buttons">';

    // share button
    html += '<a href="#" class="btn btn-info normal action-playlist-item-share" style="margin-right: 5px;" data-playlist-item-id="'+playlist_item.id+'">';
    html += '<i class="material-icons" style="padding-top: 8px; font-size: 18px;">share</i>';
    html += '</a>';

    // play button
    var playback_url = get_playback_url(playlist_item.id);
    if(playback_url) {
        var onclick;
        if(params.client_ip == "127.0.0.1") {
            html += '<div class="btn btn-info normal" style="padding-right: 0px;">';
            html += '<div style="float: left;" class="action-play-item" data-playlist-item-id="'+playlist_item.id+'"><span class="translate" data-string-id="play">' + __('play') + '</span></div>';
        }
        else {
            html += '<div class="btn btn-info normal">';
            html += '<div style="float: left;" onclick="location.href = &quot;'+playback_url+'&quot;;"><span class="translate" data-string-id="play">' + __('play') + '</span></div>';
        }

        if(params.client_ip == "127.0.0.1") {
            var containerId = "item-available-players-"+playlist_item.id;
            html += '<div class="dropdown-toggle action-get-available-players" data-container-id="'+containerId+'" data-playlist-item-id="'+playlist_item.id+'" style="float: left; margin-left: 15px; padding-left: 5px; padding-right: 6px; border-left: 1px solid #fff;" data-toggle="dropdown">';
            html += '<span class="bootstrap-caret"></span>';
            html += '</div>';
            html += '<ul id="'+containerId+'" class="dropdown-menu bootstrap-dropdown-menu" style="width: 300px; padding: 7px;" role="menu">';
            html += '</ul>';
        }
        html += '</div>';
    }

    // delete button
    html += '<a href="#" class="btn btn-info btn-delete" style="margin-left: 5px;" onclick="delete_playlist_item('+playlist_item.id+'); return false;" title="' + __('delete') + '">&times;</a>';

    html += '</td>';

    return html;
}

function reload_playlist_trash() {
    var request = {
        method: "playlist_trash_get",
        owner: params.current_media_owner
        };
    sendRequest(request,
        // onsuccess
        function(response) {
            show_playlist_trash(response.data);
        },
        // onfailure
        function(error) {
            showNotification(error, 5);
        }
    );
}

function show_playlist_trash(data)
{
    if(data.length == 0) {
        $("#playlist-trash").empty().html(__('recycle-is-empty'));
        return;
    }

    var html = '<table class="table table-bordered table-striped" cellspacing="0" cellpadding="0" border="0"><tr>';
    html += '<th>' + __('category') + '</th>';
    html += '<th>' + __('subcategory') + '</th>';
    html += '<th>' + __('title') + '</th>';
    html += '<th>' + __('content-id') + '</th>';
    html += '<th>' + __('type') + '</th>';
    html += '<th>&nbsp;</th>';
    html += '</tr>';
    for(var i=0; i < data.length; i++) {
        var type_names = {
            'live': 'Live',
            'vod': 'VOD'
        };

        if(!data[i].category) {
            data[i].category = "other";
        }

        html += '<tr>';
        html += '<td>'+data[i].category+'</td>';
        html += '<td>'+data[i].subcategory+'</td>';
        html += '<td>'+data[i].title+'</td>';
        html += '<td>';
        html += data[i].content_id;
        if(params.dev_mode) {
            html += "<br/>" + data[i].infohash;
        }
        html += '</td>';
        html += '<td>'+type_names[data[i].content_type]+'</td>';
        html += '<td>';
        html += '<a href="#" style="text-decoration:none;color:#5ab880;" onclick="restore_playlist_item('+data[i].id+'); return false;" title="' + __('restore') + '">' + __('restore') + '</a>';
        html += '</td>';
        html += '</tr>';
    }
    html += '</table>';
    $("#playlist-trash").html(html);
}

function clear_playlist_trash() {
    if(!window.confirm(__('empty-recycle-confirm'))) {
        return false;
    }
    sendRequest({
        method: "playlist_trash_clear",
        owner: params.current_media_owner
        },
        // onsuccess
        function(response) {
            reload_playlist_trash();
        },
        // onfailure
        function(error) {
            showNotification(error, 5);
        }
    );
}

function clear_playlist() {
    if(!window.confirm(__('clear-playlist-confirm'))) {
        return false;
    }
    sendRequest({
        method: "playlist_clear",
        owner: params.current_media_owner
        },
        // onsuccess
        function(response) {
            reload_playlist();
        },
        // onfailure
        function(error) {
            showNotification(error, 5);
        }
    );
}

function reload_playlist_url(ip_list)
{
    var url,
        category_url,
        i, j,
        ip_list = ip_list || params.ip_list,
        media_count = params.media_count || {},
        currentCategory = $("#filter-category").val(),
        categories = ["movies", "tv", "music", "music_video", "other"],
        allow_remote_access = !!$("#allow_remote_access").is(":checked"),
        allow_intranet_access = !!$("#allow_intranet_access").is(":checked");

    var $current = $("#playlist-url-popup .current-playlist");
    var $other_local_address = $("#playlist-url-popup .other-playlists .local-address .url-list");
    var $other_local_network = $("#playlist-url-popup .other-playlists .local-network .url-list");
    var $other_remote_access = $("#playlist-url-popup .other-playlists .remote-access .url-list");

    $current.empty();
    $other_local_address.empty();
    $other_local_network.empty();
    $other_remote_access.empty();

    // all playlist
    if(params.client_ip == "127.0.0.1") {
        // add localhost
        url = "http://127.0.0.1:"+params.http_port+"/playlist/"+params.playlist_id+".m3u";
        $other_local_address.append('<div>'+__('all-playlist')+': <a href="'+url+'" target="_blank">'+url+'</a></div>');
    }
    if(allow_intranet_access) {
        if(params.ip_is_local) {
            // local ip list
            for(j=0; j<ip_list.length; j++) {
                url = "http://"+ip_list[j]+":"+params.http_port+"/playlist/"+params.playlist_id+".m3u";
                $other_local_network.append('<div>'+__('all-playlist')+': <a href="'+url+'" target="_blank">'+url+'</a></div>');
            }
        }
    }
    if(allow_remote_access) {
        if(params.external_ip) {
            // external ip
            url = "http://"+params.external_ip+":"+params.http_port+"/playlist/"+params.playlist_id+".m3u";
            $other_remote_access.append('<div>'+__('all-playlist')+': <a href="'+url+'" target="_blank">'+url+'</a></div>');
        }
    }

    // by categories
    for(i=0; i<categories.length; i++) {
        var category = categories[i],
            isCurrent = (currentCategory == category);

        if(!isCurrent && !media_count[category]) {
            // empty category
            continue;
        }

        if(params.client_ip == "127.0.0.1") {
            // add localhost
            url = "http://127.0.0.1:"+params.http_port+"/playlist/"+params.playlist_id+".m3u";
            category_url = url + '?category='+category;

            if(isCurrent) {
                $current.append('<div>'+__('local-address')+': <a href="'+category_url+'" target="_blank">'+category_url+'</a></div>');
            }
            else {
                $other_local_address.append('<div>'+__(category)+': <a href="'+category_url+'" target="_blank">'+category_url+'</a></div>');
            }
        }

        if(allow_intranet_access) {
            if(params.ip_is_local) {
                // local ip list
                for(j=0; j<ip_list.length; j++) {
                    url = "http://"+ip_list[j]+":"+params.http_port+"/playlist/"+params.playlist_id+".m3u";
                    category_url = url + '?category='+category;
                    if(isCurrent) {
                        $current.append('<div>'+__('local-network')+': <a href="'+category_url+'" target="_blank">'+category_url+'</a></div>');
                    }
                    else {
                        $other_local_network.append('<div>'+__(category)+': <a href="'+category_url+'" target="_blank">'+category_url+'</a></div>');
                    }
                }
            }
        }

        if(allow_remote_access) {
            if(params.external_ip) {
                // external ip
                url = "http://"+params.external_ip+":"+params.http_port+"/playlist/"+params.playlist_id+".m3u";
                category_url = url + '?category='+category;
                if(isCurrent) {
                    $current.append('<div>'+__('remote-access')+': <a href="'+category_url+'" target="_blank">'+category_url+'</a></div>');
                }
                else {
                    $other_remote_access.append('<div>'+__(category)+': <a href="'+category_url+'" target="_blank">'+category_url+'</a></div>');
                }
            }
        }
    }
}

function reload_webui_url(ip_list)
{
    var url,
        i,
        path,
        has_webui_password = !!params.webui_server_password,
        allow_remote_access = !!$("#allow_remote_access").is(":checked"),
        allow_intranet_access = !!$("#allow_intranet_access").is(":checked");

    $("#webui_url").empty();

    if(has_webui_password) {
        path = "/server";
    }
    else {
        path = "/webui/app/"+params.webui_access_token+"/server";
    }

    if(params.client_ip == "127.0.0.1") {
        // add localhost
        url = "http://127.0.0.1:"+params.http_port+path;
        $("#webui_url").append('<div>'+url+' (localhost)</div>');
    }

    if(allow_intranet_access) {
        if(params.ip_is_local) {
            // local ip list
            for(i=0; i<ip_list.length; i++) {
                url = "http://"+ip_list[i]+":"+params.http_port+path;
                $("#webui_url").append('<div>'+url+' (local network)</div>');
            }
        }
    }

    if(allow_remote_access) {
        if(params.external_ip) {
            // external ip
            check_port_html = (params.locale == "ru_RU") ? ', ' + __('check-port') + ' <a href="http://2ip.ru/check-port/?port='+params.http_port+'" target="_blank" style="text-decoration: underline;">' + __('here') + '</a>' : '';
            url = "http://"+params.external_ip+":"+params.http_port+path;
            $("#webui_url").append('<div><a href="'+url+'" target="_blank">'+url+'</a> (external ip'+check_port_html+')</div>');
        }
    }
}

function reload_external_playlists() {
    var request = {
        method: "external_playlist_get",
        type: "content"
        };

    sendRequest(request,
        // onsuccess
        function(response) {
            show_external_playlist(response.playlist);
        },
        // onfailure
        function(error) {
            showNotification(error, 5);
        }
    );
}

function show_external_playlist(data)
{
    if(data.length == 0) {
        $("#external-playlists").empty().html(__('no-imp-playlist'));
        return;
    }

    var $filter = $("#filter-external-playlist-id");
    $filter.empty();
    $filter.append('<option value="-2">' + __('show-all') + '</option>');

    var html = '<table class="table table-bordered table-striped" cellspacing="0" cellpadding="0" border="0"><tr>';
    html += '<th>' + __('name') + '</th>';
    html += '<th>' + __('url') + '</th>';
    html += '<th>' + __('last-updated') + '</th>';
    html += '<th>&nbsp;</th>';
    html += '</tr>';
    for(var i=0; i < data.length; i++) {
        var last_update;
        if(data[i].last_update === undefined || data[i].last_update === null) {
            last_update = "-";
        }
        else {
            last_update = strftime('%F %T', new Date(parseInt(data[i].last_update * 1000)));
        }

        html += '<tr>';
        html += '<td>'+data[i].name+'</td>';
        html += '<td>'+data[i].url+'</td>';
        html += '<td>'+last_update+'</td>';
        html += '<td>';
        html += '<a href="#" style="text-decoration:none;color:black;" onclick="update_external_playlist('+data[i].id+'); return false;" title="' + __('update') + '"><i class="icon icon-refresh"></i></a>';
        html += ' <a href="#" style="text-decoration:none;color:black;" onclick="edit_external_playlist('+data[i].id+'); return false;" title="' + __('edit') + '"><i class="icon icon-edit"></i></a>';
        //html += ' <a href="#" style="text-decoration:none;color:black;" onclick="view_external_playlist('+data[i].id+'); return false;" title="' + __('view-playlist') + '"><i class="icon icon-eye-open"></i></a>';
        html += ' <a href="#" style="text-decoration:none;color:black;" onclick="delete_external_playlist('+data[i].id+'); return false;" title="' + __('delete') + '"><i class="icon icon-remove"></i></a>';
        html += '</td>';
        html += '</tr>';
        $filter.append('<option value="'+data[i].id+'">'+data[i].name+'</option>');
    }
    html += '</table>';
    $("#external-playlists").html(html);
}

function delete_external_playlist(playlist_id)
{
    if(!window.confirm(__('del-ext-playlist-confirm'))) {
        return false;
    }
    sendRequest({
            method: "external_playlist_delete",
            id: playlist_id
            },
            // onsuccess
            function(response) {
                reload_external_playlists();
                reload_playlist();
                reload_playlist_trash();
                reload_broadcast_list();
            }
        );
    return true;
}

function update_external_playlist(playlist_id)
{
    sendRequest({
            method: "external_playlist_update",
            id: playlist_id
            }
        );
    return true;
}

function view_external_playlist(playlist_id) {
    reload_playlist(playlist_id);
    show_page("proxy-server-playlist");
}

////////////////////////////////////////////////////////////////////////////////
// EPG sources

function add_epg_source()
{
    var format = $("#add-epg-source-format").val().trim(),
        url = $("#add-epg-source-url").val().trim(),
        update_interval = $("#add-epg-source-update-interval").val();

    if(url.length == 0) {
        alert("Empty url");
        return false;
    }
    if(!/^https?:\/\//.test(url)) {
        alert("URL must start with http:// or https://");
        return false;
    }
    sendRequest({
        method: "epg_source_add",
        epg_format: format,
        url: url,
        update_interval: update_interval
        },
        // onsuccess
        function(response) {
            $("#add-epg-source-url").val("");
            reload_epg_sources();
            reload_playlist();
        },
        // failure
        function(error) {
            showNotification(error, 5)
        }
    );
}

function reload_epg_sources() {
    var request = {
        method: "epg_source_get_list"
        };

    sendRequest(request,
        // onsuccess
        function(response) {
            show_epg_sources(response.sources);
        },
        // onfailure
        function(error) {
            showNotification(error, 5);
        }
    );
}

function show_epg_sources(data)
{
    if(data.length == 0) {
        $("#epg-sources").empty().html(__('no-epg-sources'));
        return;
    }

    var html = '<table class="table table-bordered table-striped" cellspacing="0" cellpadding="0" border="0"><tr>';
    html += '<th>#</th>';
    html += '<th>' + __('url') + '</th>';
    html += '<th>' + __('last-updated') + '</th>';
    html += '<th>&nbsp;</th>';
    html += '</tr>';
    for(var i=0; i < data.length; i++) {
        var last_update;
        if(data[i].last_update === undefined || data[i].last_update === null) {
            last_update = "-";
        }
        else {
            last_update = strftime('%F %T', new Date(parseInt(data[i].last_update * 1000)));
        }

        html += '<tr>';
        html += '<td>'+(i+1)+'</td>';
        html += '<td>'+data[i].url+'</td>';
        html += '<td>'+last_update+'</td>';
        html += '<td>';
        html += '<a href="#" style="text-decoration:none;color:black;" onclick="set_epg_source_priority(\''+data[i].id+'\', 1); return false;" title="' + __('move-down') + '"><i class="icon icon-arrow-down"></i></a>';
        html += '<a href="#" style="text-decoration:none;color:black;" onclick="set_epg_source_priority(\''+data[i].id+'\', -1); return false;" title="' + __('move-up') + '"><i class="icon icon-arrow-up"></i></a>';
        html += '<a href="#" style="text-decoration:none;color:black;" onclick="update_epg_source(\''+data[i].id+'\'); return false;" title="' + __('update') + '"><i class="icon icon-refresh"></i></a>';
        html += ' <a href="#" style="text-decoration:none;color:black;" onclick="delete_epg_source(\''+data[i].id+'\'); return false;" title="' + __('delete') + '"><i class="icon icon-remove"></i></a>';
        html += '</td>';
        html += '</tr>';
    }
    html += '</table>';
    $("#epg-sources").html(html);
}

function delete_epg_source(source_id)
{
    if(!window.confirm(__('del-epg-source-confirm'))) {
        return false;
    }
    sendRequest({
            method: "epg_source_delete",
            id: source_id
            },
            // onsuccess
            function(response) {
                reload_epg_sources();
            }
        );
    return true;
}

function update_epg_source(source_id)
{
    sendRequest({
            method: "epg_source_update",
            id: source_id
            }
        );
    return true;
}

function set_epg_source_priority(source_id, value)
{
    sendRequest({
            method: "epg_source_set_priority",
            id: source_id,
            value: value
            },
            // onsuccess
            function(response) {
                reload_epg_sources();
            }
        );
    return true;
}

function set_preferred_epg_languages(value)
{
    sendRequest({
            method: "set_preferred_epg_languages",
            value: value.join(",")
            },
            // onsuccess
            function(response) {
                show_preferred_epg_languages(value);
            }
        );
    return true;
}

function get_lang_name(lang) {
    if(lang == "auto") {
        return __('auto');
    }
    else {
        if(languageNames[lang] !== undefined) {
            return languageNames[lang].native + " (" + languageNames[lang].name + ")";
        }
        else {
            return lang;
        }
    }
}

function show_preferred_epg_languages(value) {
    var langNames = [];

    if(value.length == 0) {
        value.push("auto");
    }

    for(var i=0, len=value.length; i<len; i++) {
        var lang = value[i];
        langNames.push(get_lang_name(lang));
    }
    $("#preferred-epg-languages-value").html(langNames.join(", "));
}

function reload_system_epg_sources() {
    var request = {
        method: "epg_get_system_sources"
        };

    sendRequest(request,
        // onsuccess
        function(response) {
            show_system_epg_sources(response.sources);
        },
        // onfailure
        function(error) {
            showNotification(error, 5);
        }
    );
}

function show_system_epg_sources(data)
{
    if(data.length == 0) {
        $("#system-epg-sources").empty().html(__('no-epg-sources'));
        return;
    }

    var html = '<table class="table table-bordered table-striped" cellspacing="0" cellpadding="0" border="0"><tr>';
    html += '<th>#</th>';
    html += '<th>' + __('name') + '</th>';
    html += '</tr>';
    for(var i=0; i < data.length; i++) {
        html += '<tr>';
        html += '<td>'+data[i].id+'</td>';
        html += '<td>'+data[i].name+'</td>';
        html += '</tr>';
    }
    html += '</table>';
    $("#system-epg-sources").html(html);
}

function update_visible_playlist_items()
{
    var currentCategory = $("#filter-category").val();

    if(current_page_ == "proxy-server-playlist") {
        var item_id_list = [];

        $(".playlist-item-row").each(function() {
            var itemId = $(this).data("item-id");
            if(itemId) {
                item_id_list.push(itemId);
            }
        });

        if(item_id_list.length > 0) {
            sendRequest(
                {
                    method: "playlist_get",
                    item_id: item_id_list.join(",")
                },
                // onsuccess
                function(response) {
                    if(response.playlist) {
                        for(var i=0; i<response.playlist.length; i++) {
                            var item = response.playlist[i];
                            $("#playlist-item-row-" + item.id).html(render_playlist_item_row(item));
                        }
                    }
                }
                );
        }
    }
}

function render_search_results(data, total_items, page, page_size, scroll)
{
    if(scroll) {
        // 65 - sticky top bar height
        var pos = findPos(document.getElementById("search-results"));
        window.scroll(0, pos-65);
    }

    if(data.length == 0) {
        $("#search-results").empty().html(__('search-results-empty'));
        return;
    }

    var html = '<table class="table table-bordered table-striped" cellspacing="0" cellpadding="0" border="0"><tr>';
    html += '<th><span class="translate" data-string-id="media">' + __('media') + '</span>&nbsp;/&nbsp;<span class="translate" data-string-id="category">' + __('category') + '</span></th>';

    html += '<th width="95%">';
    html += '<span class="translate" data-string-id="title">' + __('title') + '</span>';
    html += '&nbsp;/&nbsp;<span class="translate" data-string-id="description">' + __('description') + '</span>';
    html += '</th>';

    html += '<th><span class="translate" data-string-id="play">' + __('play') + '</span></th>';
    html += '</tr>';

    for(var i=0; i < data.length; i++) {
        html += '<tr class="search-results-item-row" data-item-id="'+data[i].infohash+'" id="search-results-item-row-'+data[i].infohash+'">';
        html += render_search_results_item(data[i]);
        html += '</tr>';
    }
    html += '</table>';

    // pagination
    var count_pages = Math.ceil(total_items / page_size);
    if(count_pages > 1) {
        html += '<div class="search-results-pagination" style="margin-top: 10px;">';

        if(count_pages <= 3) {
            // show just page numbers
            for(var i=0; i < count_pages; i++) {
                if(i === page) {
                    html += '<a href="#" class="btn btn-info" onclick="return false;">' + (i+1) + '</a> ';
                }
                else {
                    html += '<a href="#" class="btn btn-info white" onclick="load_search_results_page({page:'+i+', scroll:true}); return false;">' + (i+1) + '</a> ';
                }
            }
        }
        else {
            // first
            html += '<a href="#" class="btn btn-info white" onclick="load_search_results_page({page:0, scroll:true}); return false;">&lt;&lt;</a> ';
            // prev
            html += '<a href="#" class="btn btn-info white" onclick="load_search_results_page({page:'+Math.max(0, page-1)+', scroll:true}); return false;">&lt;</a> ';

            var start = Math.max(page-2, 0),
                end = Math.min(page+2, count_pages-1);

            start = Math.max(0, Math.min(start, end-4));
            end = Math.min(count_pages-1, Math.max(end, start+4));

            for(var i=start; i <= end; i++) {
                if(i === page) {
                    html += '<a href="#" class="btn btn-info" onclick="return false;">' + (i+1) + '</a> ';
                }
                else {
                    html += '<a href="#" class="btn btn-info white" onclick="load_search_results_page({page:'+i+', scroll:true}); return false;">' + (i+1) + '</a> ';
                }
            }

            // last page number
            if(end < count_pages-2) {
                html += '<a href="#" class="btn btn-info white" onclick="return false;">...</a> ';
            }
            if(end < count_pages-1) {
                html += '<a href="#" class="btn btn-info white" onclick="load_search_results_page({page:'+(count_pages-1)+', scroll:true}); return false;">' + count_pages + '</a> ';
            }

            // next
            html += '<a href="#" class="btn btn-info white" onclick="load_search_results_page({page:'+Math.min(page+1, count_pages-1)+', scroll:true}); return false;">&gt;</a> ';
            // last
            html += '<a href="#" class="btn btn-info white" onclick="load_search_results_page({page:'+(count_pages-1)+', scroll:true}); return false;">&gt;&gt;</a>';
        }

        html += '</div>';
    }

    // update html
    $("#search-results").html(html);

    // reinit clipboard
    if(search_results_clipboard_) {
        search_results_clipboard_.destroy();
    }
    search_results_clipboard_ = new Clipboard('#search-results .clipboard-trigger-a', {
        text: function(trigger) {
            var $item = $($(trigger).data("target-selector"));
            return $item.attr("href") || $item.val() || $item.text();
        }
    });
}

function render_search_results_item(item)
{
    var i, url, title, firstItem, html = "";

    // get first item
    if(item.items && item.items.length > 0) {
        firstItem = item.items[0];
    }
    else {
        // no items
        return "";
    }

    // wrap on a period
    title = item.name.replace(/\./g, '.<wbr>');

    // category
    html += '<td style="position: relative;">';
    html += __('tv');
    if(firstItem.categories && firstItem.categories.length) {
        for(i=0; i<firstItem.categories.length; i++) {
            html += '<br/>';
            html += __('category-' + firstItem.categories[i]);
        }
    }
    html += '</td>';

    // icon/description
    html += '<td>';
    html += '<table class="hidden-table" cellspacing="0" cellpadding="0"><tr>';
    html += '<td style="min-width: 50px; vertical-align: top;">';
    if(item.icon) {
        html += '<img src="'+item.icon+'" />';
    }
    html += '</td>';

    html += '<td width="95%">';
    html += '<span style="font-size: 16px;">' + title + '</span>';

    if(params.debug_webui_client) {
        html += '<div>infohash: ' + firstItem.infohash + '</div>';
    }

    if(item.epg) {
        html += '<br/>';
        var now = moment();
        var start = moment.unix(item.epg.start);
        var stop = moment.unix(item.epg.stop);

        var secondsPlayed = moment.duration(now.diff(start)).asSeconds();
        var totalSeconds = item.epg.stop - item.epg.start;
        var playedPercent = Math.round(secondsPlayed / totalSeconds * 100);

        html += start.format("HH:mm") + " - ";
        html += stop.format("HH:mm") + " ";
        html += item.epg.name;
        html += '<div style="position: relative; width: 200px; height: 10px; background-color: #ccc;">';
        html += '<div style="position: absolute; left: 0; top: 0; width: '+playedPercent+'%; height: 100%; background-color: #80AFCA;"></div>';
        html += '</div>';
    }

    if(item.items && item.items.length > 1) {
        html += '<div style="margin-top: 10px;">';
        html += '<div class="other-broadcasts-spoiler-toggle" style="cursor: pointer;">';
        html += '<span class="spoiler-toggle">+</span> <span class="translate" data-string-id="other-available-broadcasts">' + __('other-available-broadcasts')  + '</span>';
        html += '</div>';

        html += '<table cellspacing="0" cellpadding="0" class="hidden-table spoiler-table" style="display: none; width: auto;">';
        for(i=1; i<item.items.length; i++) {
            var _item = item.items[i],
                bitrate = _item.bitrate,
                infohash = _item.infohash;

            html += '<tr>';

            // # and bitrate
            html += '<td>';
            //html += i + ".";
            if(bitrate) {
                html += " " + (bitrate * 8 / 1000000).toFixed(2) + " Mbps";
            }
            if(params.debug_webui_client) {
                html += ' (infohash: ' + _item.infohash + ')';
            }
            html += '</td>';

            // status
            html += '<td>';
            var statusColor;
            if(_item.status == 2) {
                statusColor = "green";
            }
            else if(_item.status == 1) {
                statusColor = "#dddd00";
            }

            if(statusColor) {
                html += '<div class="simple-circle-14" title="'+__('broadcast-status')+'" style="display: inline-block; background-color: '+statusColor+';"></div>';
            }
            html += '</td>';

            // share button
            html += '<td>';
            html += '<a href="#" title="' + __('share') + '" class="action-search-item-share" style="color: #888;" data-infohash="'+infohash+'">';
            html += '<i class="material-icons" style="font-size: 18px;">share</i>';
            html += '</a>';
            html += '</td>';

            // add to playlist button
            html += '<td>';
            html += '<a href="#" title="' + __('add-to-playlist') + '" class="action-add-search-item-to-playlist" style="color: #888;" data-is-first="0" data-infohash="'+infohash+'" data-in-playlist="'+(_item.in_playlist ? 'yes' : 'no')+'">';
            html += '<i class="material-icons" style="font-size: 18px;">' + (_item.in_playlist ? 'playlist_add_check' : 'playlist_add') + '</i>';
            html += '</a>';
            html += '</td>';

            // play button
            html += '<td>';

            var containerId = "item-available-players-"+infohash;
            html += '<div style="display: inline-block; position: relative;">'
            html += '<a href="#" class="dropdown-toggle action-get-available-players" data-toggle="dropdown" style="color: #888;" data-infohash="'+infohash+'" data-container-id="'+containerId+'">';
            html += '<i class="material-icons" style="font-size: 18px;">more_vert</i>';
            html += '</a>';

            html += '<ul id="'+containerId+'" class="dropdown-menu bootstrap-dropdown-menu" style="width: 300px; padding: 7px;" role="menu">';
            html += '</ul>';
            html += '</div>';

            html += '<a href="#" class="action-play-item" style="color: #888;" data-infohash="'+infohash+'">';
            html += '<i class="material-icons" style="font-size: 18px;">play_arrow</i>';
            html += '</a>';

            html += '</td>';

            html += '</tr>';
        }
        html += '</table>';
        html += '</div>';
    }

    html += '</td>'

    // EPG button
    if(item.epg && firstItem.channel_id) {
        // epg button
        html += '<td style="text-align: right; vertical-align: top;">'
        html += '<a href="#" class="btn btn-info white action-search-item-get-epg" data-channel-id="'+firstItem.channel_id+'" data-channel-name="'+item.name.replace(/"/g, "&quot;")+'" title="' + __('show-epg') + '">EPG</a>';
        html += '</td>';
    }

    html += '</tr></table>'; // end of inner table
    html += '</td>';

    // buttons
    html += '<td style="text-align: right; vertical-align: top; padding-top: 16px; white-space: nowrap; min-width: 250px;" class="playlist-buttons">';

    // share button
    html += '<a href="#" class="btn btn-info normal action-search-item-share" style="margin-right: 5px;" data-infohash="'+firstItem.infohash+'">';
    html += '<i class="material-icons" style="padding-top: 8px; font-size: 18px;">share</i>';
    html += '</a>';

    // add to playlist button
    html += '<a href="#" class="btn btn-info normal action-add-search-item-to-playlist" style="margin-right: 5px;" data-is-first="1" data-infohash="'+firstItem.infohash+'" data-in-playlist="'+(firstItem.in_playlist ? 'yes' : 'no')+'">';
    html += '<i class="material-icons" style="padding-top: 8px; font-size: 18px;">' + (firstItem.in_playlist ? 'playlist_add_check' : 'playlist_add') + '</i>';
    html += '</a>';

    // play button
    var playback_url = get_playback_url_for_infohash(firstItem.infohash);
    if(playback_url) {
        if(params.client_ip == "127.0.0.1") {
            html += '<div class="btn btn-info normal" style="padding-right: 0px;">';
            html += '<div class="action-play-item" data-infohash="'+firstItem.infohash+'" style="float: left;"><span class="translate" data-string-id="play">' + __('play') + '</span></div>';
        }
        else {
            html += '<div class="btn btn-info normal">';
            html += '<div style="float: left;" onclick="location.href = &quot;'+playback_url+'&quot;;"><span class="translate" data-string-id="play">' + __('play') + '</span></div>';
        }

        if(params.client_ip == "127.0.0.1") {
            var containerId = "item-available-players-"+firstItem.infohash;

            html += '<div class="dropdown-toggle action-get-available-players" data-infohash="'+firstItem.infohash+'" data-container-id="'+containerId+'" style="float: left; margin-left: 15px; padding-left: 5px; padding-right: 6px; border-left: 1px solid #fff;" data-toggle="dropdown">';
            html += '<span class="bootstrap-caret"></span>';
            html += '</div>';
            html += '<ul id="'+containerId+'" class="dropdown-menu bootstrap-dropdown-menu" style="width: 300px; padding: 7px;" role="menu">';
            html += '</ul>';
        }
        html += '</div>';
    }

    html += '</td>';

    return html;
}