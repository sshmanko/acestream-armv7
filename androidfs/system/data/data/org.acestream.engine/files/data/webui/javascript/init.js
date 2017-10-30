get_language_names();
reload_locale();

$(".redirect-page").each(function() {
        var page_id = $(this).data("page-id");
        $(this).val(window.location.pathname + "#" + page_id);
});

// debug settings
if(params.debug_webui_client) {
    params.allow_remote_search = true;
}

////////////////////////////////////////////////////////////////////////////////
// Set public trackers
$("#p2p_trackers").val(params.public_trackers.join("\n"));
$("#hls_trackers").val(params.public_trackers.join("\n"));
$("#add-external-hls-playlist-trackers").val(params.public_trackers.join("\n"));

////////////////////////////////////////////////////////////////////////////////
// Show elements depending on params
if(params.epg_enabled) {
    $(".visible-when-epg-enabled").removeClass("hidden");
}

if(params.user_epg_enabled) {
    $(".visible-when-user-epg-enabled").removeClass("hidden");
}

if(params.allow_remote_search) {
    $(".visible-when-search-enabled").removeClass("hidden");
}

////////////////////////////////////////////////////////////////////////////////
// Events
function set_search_type(type) {
    update_search_type(type);
    $("#radio-search-type-" + type).prop("checked", true);
}

function update_search_type(type)
{
    if(type === undefined) {
        type = $(".radio-search-type:checked").val();
    }

    if(type == "local") {
        $("#search-results-container").hide();
        $("#playlist-container").show();
        $("#search-remote").hide();
        $("#search-remote-category").hide();
        $("#filter-name").show();
        $("#filter-subcategory").show();
        $("#filter-category").prop("disabled", false);

        $(".visible-local-search").show();
        $(".hidden-locale-search").hide();
    }
    else {
        $("#playlist-container").hide();
        $("#search-results-container").show();
        $("#search-remote").show();
        $("#search-remote-category").show();
        $("#filter-name").hide();
        $("#filter-subcategory").hide();
        $("#filter-category").prop("disabled", true);

        $(".visible-remote-search").show();
        $(".hidden-remote-search").hide();
    }
}

$(".radio-search-type").on("click", function() {
    update_search_type();
});

function load_search_results_page(details) {
    if(window._last_search_params === undefined) {
        console.log("missing last search params");
        return;
    }

    var _params = window._last_search_params
    _params.page = details.page || 0;

    sendRequest(
        _params,
        function(response) {
            render_search_results(response.results, response.total, _params.page, _params.page_size, details.scroll);
        }
        );
}

function search(query) {
    var _params = {
        method: "search",
        page: 0,
        page_size: 10,
        group_by_channels: 1,
        show_epg: 1
    };

    var gotQuery = false;

    if(query) {
        _params['query'] = query;
        gotQuery = true;
    }

    var category = $("#search-remote-category").val();
    if(category != "_all_") {
        _params['category'] = category;
        gotQuery = true;
    }

    if(!gotQuery) {
        $("#search-results").empty().html(__('search-results-empty'));
        return;
    }

    window._last_search_params = _params;

    sendRequest(
        _params,
        function(response) {
            console.log(response);
            render_search_results(response.results, response.total, _params.page, _params.page_size);
        }
        );
}

$("#search-remote").on("keyup", function(e) {
    if(e.keyCode == 13) {
        search($(this).val());
        $("#search-remote").autocomplete("close");
    }
});

$("#search-remote").autocomplete({
        source: function(request, callback) {
            var _params = {
                method: "suggest",
                query: request.term
            };

            var category = $("#search-remote-category").val();
            if(category != "_all_") {
                _params['category'] = category;
            }

            sendRequest(
                _params,
                function(response) {
                    if(response.results) {
                        var data = [], r = response.results;
                        for(var i=0, len=r.length; i<len; i++) {
                            data.push(r[i].name);
                        }
                        callback(data);
                    }
                }
                );
        },
      minLength: 2,
      select: function( event, ui ) {
        search(ui.item.value);
        console.log( ui.item ?
          "Selected: " + ui.item.value + " aka " + ui.item.id :
          "Nothing selected, input was " + this.value );
      }
    });

$("#search-remote-category").change(function() {
    search($("#search-remote").val());
});

$("#playlist-add-item-category").change(function() {
    update_subcategories_cache($(this).val());
});
$("#playlist-add-item-subcategory").autocomplete({
    source: function(request, callback) {
        var currentCategory = $("#playlist-add-item-category").val();
        var cache = subcategory_cache[currentCategory];
        var res = [];
        if(cache) {
            for(var i=0; i<cache.length; i++) {
                var name = cache[i];
                if(name.indexOf(request.term) == 0) {
                    res.push(name);
                }
            }

        }
        callback(res);
    }
});

$("body").on("click", ".action-get-available-players", function(e) {
    e.preventDefault();

    get_available_players({
        infohash: $(this).data("infohash"),
        playlist_item_id: $(this).data("playlist-item-id"),
        container_id: $(this).data("container-id"),
    });
});

$("body").on("click", ".action-play-item", function() {
    play_item({
        infohash: $(this).data("infohash"),
        playlist_item_id: $(this).data("playlist-item-id"),
    });
});

$("#search-results").on("click", ".action-search-item-share", function(e) {
    e.preventDefault();
    var infohash = $(this).data("infohash");
    open_share_popup({
        infohash: infohash
    });
});

$("#search-results").on("click", ".action-add-search-item-to-playlist", function(e) {
    e.preventDefault();
    var $this = $(this),
        infohash = $(this).data("infohash"),
        isFirst = $(this).data("is-first"),
        inPlaylist = $(this).data("in-playlist");

    if(inPlaylist === "yes") {
        // already in playlist
        return;
    }

    add_playlist_item2({
        category: "tv",
        infohash: infohash,
        auto_search: isFirst,
        onsuccess: function() {
            $this.find("i").text("playlist_add_check");
            $this.data("in-playlist", "yes");
            reload_playlist();
            reload_media_count();
        }
    });
});

$("#search-results").on("click", ".action-search-item-get-epg", function(e) {
    e.preventDefault();

    var now = moment().unix(),
        channelName = $(this).data("channel-name");

    var _params = {
        method: "get_server_epg",
        channel_id: $(this).data("channel-id"),
        min_stop: now,
        max_start: now + 12*3600,
    };
    sendRequest(
        _params,
        function(response) {
            console.log(response);
            if(response && response.results) {
                open_epg_popup(channelName, render_epg_list(response.results));
            }
        }
        );
});

$("#search-results").on("click", ".other-broadcasts-spoiler-toggle", function(e) {
    e.preventDefault();

    var $data = $(this).parent().find(".spoiler-table"),
        $toggle = $(this).find(".spoiler-toggle");

    if($(this).data("spoiler-opened")) {
        $data.slideUp(100);
        $(this).data("spoiler-opened", false);
        $toggle.text("+");
    }
    else {
        $data.slideDown(250);
        $(this).data("spoiler-opened", true);
        $toggle.text("-");
    }

    // var $content = $('#playlist-url-popup-content');
    // $content.css({"height": "auto"});

    // $data.promise().done(function() {
    //     // reinit height
    //     var wrap_height = $('#playlist-url-popup .popup2-wrap').height();
    //     if(wrap_height) {
    //         $content.css({"height": (wrap_height-72) + "px"});
    //     }
    // });
});

$("#playlist").on("change", "#playlist-check-all", function() {
        var checked = $(this).is(":checked");
        $(".playlist-check-item").prop("checked", checked);
});

$("#playlist").on("change", ".playlist-check-item", function() {
        if($(this).is(":checked")) {
            $("#playlist-check-all").prop("checked", true);
        }
        else {
            $("#playlist-check-all").prop("checked", $(".playlist-check-item:checked").size() > 0);
        }
});

$("#playlist").on("click", ".action-playlist-item-share", function(e) {
    e.preventDefault();
    var itemId = $(this).data("playlist-item-id");
    open_share_popup({
        playlist_item_id: itemId
    });
});

// toggle favorite
$("#playlist").on("click", ".action-toggle-favorite", function(e) {
    e.preventDefault();
    var value,
        itemId = $(this).data("playlist-item-id"),
        isFavorite = $(this).data("is-favorite");

    if(isFavorite == "yes") {
        value = 0;
        $(this).find("i").text("favorite_border");
        $(this).data("is-favorite", "no");
    }
    else {
        value = 1;
        $(this).find("i").text("favorite");
        $(this).data("is-favorite", "yes");
    }

    sendRequest({
        method: "playlist_item_set_favorite",
        id: itemId,
        owner: params.current_media_owner,
        value: value
    });
});

// toggle auto search
$("#playlist").on("click", ".action-toggle-auto-search", function(e) {
    e.preventDefault();
    var value,
        itemId = $(this).data("playlist-item-id"),
        currentValue = $(this).data("auto-search");

    if(currentValue == "on") {
        value = 0;
        $(this).text("Auto search: OFF");
        $(this).data("auto-search", "off");
    }
    else {
        value = 1;
        $(this).text("Auto search: ON");
        $(this).data("auto-search", "on");
    }

    sendRequest(
        {
            method: "playlist_item_set_auto_search",
            id: itemId,
            owner: params.current_media_owner,
            value: value
        },
        // onsuccess
        function(response) {
            update_visible_playlist_items();
        }
    );
});

$(".action-sync-playlist").on("click", function() {
    sendRequest({
        method: "playlist_sync"
    });
    return false;
});

$("#filter-category").change(function() {
        update_subcategories();
        reload_playlist();
        reload_playlist_url();
});
$("#filter-subcategory").change(function() {
        reload_playlist();
});
$("#filter-name").on("change paste keyup", function() {
    if(window._timerFilterName) {
        clearTimeout(window._timerFilterName);
        window._timerFilterName = null;
    }
    window._timerFilterName = setTimeout(reload_playlist, 350);
});
$("#filter-external-playlist-id").change(function() {
        reload_playlist();
});
$("#broadcasting-filter-external-playlist-id").change(function() {
        reload_broadcast_list();
});
$("#filter-status").change(function() {
        reload_broadcast_list();
});
$("#btn-delete-selected").click(function() {
        delete_selected_playlist_items();
});
$("#btn-clear-playlist").click(function() {
        clear_playlist();
});

$("#transcode_audio").change(function() {
        var value = !!$(this).is(":checked");

        if(value) {
            $("#skip_transcode_mp3").attr("disabled", false);
        }
        else {
            $("#skip_transcode_mp3").attr("disabled", true);
        }

        sendRequest({
                method: "set_transcode_audio",
                value: value ? 1 : 0,
        });
});

$("#skip_transcode_mp3").change(function() {
        var value = !!$(this).is(":checked");
        sendRequest({
                method: "set_transcode_mp3",
                value: value ? 0 : 1, // reverse
        });
});

$("#transcode_ac3").change(function() {
        var value = !!$(this).is(":checked");
        sendRequest({
                method: "set_transcode_ac3",
                value: value ? 1 : 0
        });
});

$("#preferred_audio_language").change(function() {
        sendRequest({
                method: "set_preferred_audio_language",
                value: $("#preferred_audio_language").val()
        });
});

$("#preferred_video_quality").change(function() {
        sendRequest({
                method: "set_preferred_video_quality",
                value: $("#preferred_video_quality").val()
        });
});

$("#preferred_video_bitrate").change(function() {
        sendRequest({
                method: "set_preferred_video_bitrate",
                value: $("#preferred_video_bitrate").val()
        });
});

$(".output_stream_format_live").change(function() {
        var value = $(".output_stream_format_live:checked").val();
        sendRequest({
                method: "set_playlist_output_format_live",
                value: value
        });
});

$("#p2p_bitrate_type").change(function() {
        var type = $("#p2p_bitrate_type").val();
        if(type === "auto") {
            $("#p2p_bitrate").hide();
        }
        else {
            $("#p2p_bitrate").show();
        }
});

$("#p2p_when_type").change(function() {
        var type = $(this).val();
        if(type === "permanent") {
            $("#p2p_date_container").hide();
        }
        else {
            $("#p2p_date_container").show();
        }
});

$(".output_stream_format_vod").change(function() {
        var value = $(".output_stream_format_vod:checked").val();
        sendRequest({
                method: "set_playlist_output_format_vod",
                value: value
        });
});

$("#allow_remote_access").change(function() {
        var value = !!$(this).is(":checked");
        reload_playlist_url(params.ip_list);
        reload_webui_url(params.ip_list);
        sendRequest({
                method: "set_allow_remote_access",
                value: value ? 1 : 0
        });
});

$("#allow_intranet_access").change(function() {
        var value = !!$(this).is(":checked");
        reload_playlist_url(params.ip_list);
        reload_webui_url(params.ip_list);
        sendRequest({
                method: "set_allow_intranet_access",
                value: value ? 1 : 0
        });
});

$("#enable_system_epg").change(function() {
        var value = !!$(this).is(":checked");
        sendRequest({
                method: "set_enable_system_epg",
                value: value ? 1 : 0
        },
        // onsucces
        function() {
            reload_playlist();
        },
        // onerror
        function(err) {
            showNotification(err, 5);
        }
        );
});

$("#auto_sync").change(function() {
        var value = !!$(this).is(":checked");
        sendRequest({
                method: "set_auto_sync",
                value: value ? 1 : 0
        },
        // onsucces
        function() {
        },
        // onerror
        function(err) {
            showNotification(err, 5);
        }
        );
});

$("#btn-add-external-playlist").click(function() {
        var file = $("#upload-playlist-file").val() || "";
        if(file.length == 0) {
            // send ajax request
            add_external_playlist();
        }
        else {
            // post form
            backgroundTaskSuppressErrors = true;
            $("#playlist-upload-form").submit();
        }
});

$("#btn-add-epg-source").click(function() {
    add_epg_source();
});

$("#btn-my-broadcasts-export-selected").click(function() {
        export_selected_broadcast_list_items();
});

$("#button-create-stream").click(function() {
        var name = $("#p2p_name").val(),
            description = $("#p2p-stream-description").val(),
            quality = $("#p2p_quality").val(),
            category = $("#p2p_category").val(),
            source = $("#p2p_source").val(),
            cache_dir = $("#p2p_cache_dir").val(),
            publish_dir = $("#p2p_publish_dir").val(),
            bitrate_type = $("#p2p_bitrate_type").val(),
            bitrate = $("#p2p_bitrate").val(),
            trackers = $("#p2p_trackers").val(),
            maxPeers = $("#p2p_max_peers").val(),
            provider_key = $("#p2p_provider_key").val(),
            upnp_enabled = !!$("#p2p_upnp_enabled").is(":checked"),
            allow_public_trackers = !!$("#p2p_allow_public_trackers").is(":checked");

        if(source.length == 0) {
            alert("Empty source");
            return false;
        }

        if(category.length == 0) {
            alert("Empty category");
            return false;
        }

        if(name.length == 0) {
            alert("Empty name");
            return false;
        }

        if(quality.length == 0) {
            alert("Empty quality");
            return false;
        }

        if(cache_dir.length == 0) {
            alert("Cache directory must be specified");
            return false;
        }

        if(publish_dir.length == 0) {
            alert("Publish directory must be specified");
            return false;
        }

        if(bitrate_type === "auto") {
            bitrate = 0;
        }
        else {
            bitrate = parseInt(bitrate);
            if(!bitrate) {
                alert("Empty bitrate");
                return false;
            }
        }

        if(provider_key.length > 0) {
            if(provider_key.length != 32) {
                alert("Bad provider key format");
                return false;
            }
            else if(!/[0-9a-fA-F]{32}/.test(provider_key)) {
                alert("Bad provider key format");
                return false;
            }
        }

        sendRequest({
                method: "create_stream",
                name: name,
                description: description,
                cache_dir: cache_dir,
                publish_dir: publish_dir,
                source: source,
                bitrate: bitrate,
                host: $("#p2p_host").val(),
                port: $("#p2p_port").val(),
                trackers: trackers,
                max_peers: maxPeers,
                quality: quality,
                category: category,
                upnp_enabled: upnp_enabled ? 1 : 0,
                allow_public_trackers: allow_public_trackers ? 1 : 0,
                provider_key: provider_key,
                when_type: $("#p2p_when_type").val(),
                date_from: $("#p2p_date_from input").val(),
                date_to: $("#p2p_date_to input").val(),
        },
        // onsuccess
        function(response) {
            window.location.href = "http://127.0.0.1:" + response.port + "/app/stream";
        },
        // onerror
        function() {
        },
        // timeout
        120000
        );
});

$("#button-create-hls-transport-file").click(function() {
        var manifest_url = $("#hls_manifest_url").val().trim(),
            title = $("#hls_title").val().trim(),
            category = $("#hls_category").val(),
            publish_dir = $("#hls_publish_dir").val(),
            trackers = $("#hls_trackers").val().trim();

        if(manifest_url.length == 0) {
            alert("Empty manifest URL");
            return false;
        }

        if(!/^(https?|file):\/\//.test(manifest_url)) {
            alert("Manifest URL must start with http:// or https://");
            return false;
        }

        if(title.length == 0) {
            alert("Empty title");
            return false;
        }

        if(category.length == 0) {
            alert("Empty category");
            return false;
        }

        if(publish_dir.length == 0) {
            alert("Publish directory must be specified");
            return false;
        }

        sendRequest({
                method: "create_hls_transport_file",
                manifest_url: manifest_url,
                title: title,
                publish_dir: publish_dir,
                trackers: trackers,
                category: category
        },
        // onsuccess
        function(response) {
            reload_broadcast_list();
            show_page("broadcasting-my-broadcasts");
        }
        );
});

$("#button-add-external-hls-playlist").click(function() {
        var url = $("#add-external-hls-playlist-url").val().trim(),
            name = $("#add-external-hls-playlist-name").val().trim(),
            publish_dir = $("#add-external-hls-playlist-publish-dir").val(),
            trackers = $("#add-external-hls-playlist-trackers").val().trim(),
            update_interval = $("#add-external-hls-playlist-update-interval").val(),
            save_transport_files_on_disk = $("#add-external-hls-playlist-save-transport-files-on-disk").is(":checked");

        if(url.length == 0) {
            alert("Empty playlist URL");
            return false;
        }
        if(!/^(https?|file):\/\//.test(url)) {
            alert("URL must start with http:// or https://");
            return false;
        }
        if(name.length == 0) {
            alert("Empty name");
            return false;
        }
        if(publish_dir.length == 0) {
            alert("Publish directory must be specified");
            return false;
        }

        sendRequest({
                method: "external_playlist_add",
                type: "broadcast",
                category: null,
                url: url,
                name: name,
                update_interval: update_interval,
                extra: JSON.stringify({
                    publish_dir: publish_dir,
                    trackers: trackers,
                    save_transport_files_on_disk: save_transport_files_on_disk
                })
        },
        // onsuccess
        function(response) {
            $("#add-external-hls-playlist-name").val("");
            $("#add-external-hls-playlist-url").val("");
            reload_external_hls_playlists();
        },
        // failure
        function(error) {
            showNotification(error)
        }
        );
});

$("body").on("click", ".show-page", function() {
        var pageId = $(this).attr("href");
        if(pageId) {
            // remove first symbol #
            pageId = pageId.substring(1);
        }
        show_page(pageId);
        return false;
});

$(".quick-nav-button").hover(
    function() {
        var id = $(this).data("id");
        if(!id) {
            console.log("missing quick nav id");
            return;
        }

        $(".quick-nav-button").removeClass("active");
        $(this).addClass("active");

        $(".cbp-spmenu").each(function() {
                if($(this).data("id") === id) {
                    $(this).addClass("cbp-spmenu-open");
                }
                else {
                    $(this).removeClass("cbp-spmenu-open");
                }
        });
        can_hide_sliding_menu_ = false;
    },
    function() {
        can_hide_sliding_menu_ = true;
        setTimeout(hide_sliding_menu, 100);
    }
);

$(".cbp-spmenu").hover(
    function() {
        can_hide_sliding_menu_ = false;
    },
    function() {
        can_hide_sliding_menu_ = true;
        setTimeout(hide_sliding_menu, 100);
    }
    );

$(".quick-nav-button").click(function() {
        var id = $(this).data("id");
        if(!id) {
            console.log("missing quick nav id");
            return false;
        }

        $(".quick-nav-button").removeClass("active");
        $(this).addClass("active");

        $(".cbp-spmenu").each(function() {
                if($(this).data("id") === id) {
                    $(this).toggleClass("cbp-spmenu-open");
                }
                else {
                    $(this).removeClass("cbp-spmenu-open");
                }
        });
        return false;
});

$(".cbp-spmenu").on("click", "a", function() {
        hide_sliding_menu(true);
});

$(document).on('click', function(event) {
        if (!$(event.target).closest('.quick-nav-button').length) {
            hide_sliding_menu();
        }
        if (!$(event.target).closest('#epg-popup .popup2-wrap').length) {
            close_epg_popup();
        }
        if (!$(event.target).closest('#content-id-popup').length) {
            close_content_id_popup();
        }
});

$(".action-open-remote-control").on("click", function() {
    open_remote_control();
    return false;
});

////////////////////////////////////////////////////////////////////////////////
// Init controls from params

$("#playlist_url").html(params.playlist_url);
$("#http_port").html(params.http_port);
if(params.allow_remote_access) {
    $("#allow_remote_access").attr("checked", true);
}
if(params.auto_sync) {
    $("#auto_sync").attr("checked", true);
}
if(params.enable_system_epg) {
    $("#enable_system_epg").attr("checked", true);
}
if(params.allow_intranet_access) {
    $("#allow_intranet_access").attr("checked", true);
}
if(params.transcode_audio) {
    $("#transcode_audio").attr("checked", true);
    if(!params.transcode_mp3) {
        $("#skip_transcode_mp3").attr("checked", true);
    }
}
if(params.transcode_ac3) {
    $("#transcode_ac3").attr("checked", true);
}
if(params.preferred_audio_language) {
    $("#preferred_audio_language option[value='"+params.preferred_audio_language+"']").prop('selected', true);
}
if(params.preferred_video_quality !== undefined) {
    $("#preferred_video_quality option[value='"+params.preferred_video_quality+"']").prop('selected', true);
}
if(params.preferred_video_bitrate !== undefined) {
    $("#preferred_video_bitrate option[value='"+params.preferred_video_bitrate+"']").prop('selected', true);
}
if(params.preferred_epg_languages) {
    show_preferred_epg_languages(params.preferred_epg_languages);
}
$("#output_stream_format_live_" + params.playlist_output_format_live).attr("checked", true);
$("#output_stream_format_vod_" + params.playlist_output_format_vod).attr("checked", true);
$(".form-token").val(params.access_token);

$("#p2p_date_from input").val(strftime("%Y-%m-%d %H:%M", new Date()));
$("#p2p_date_to input").val(strftime("%Y-%m-%d %H:%M", new Date()));

if(params.client_ip != "127.0.0.1") {
    $("#allow_remote_access").attr("disabled", true);
    $("#allow_intranet_access").attr("disabled", true);
}
if(params.allow_infohash_input) {
    $("#infohash-input").show();
}
$("#btn-playlist-clear").show();
if(params.error) {
    alert(params.error);
}

// list of ips for starting p2p broadcast
if(params.external_ip) {
    $("#p2p_host").append('<option value="'+params.external_ip+'">'+params.external_ip+'</option>');
}
for(var i=0, len=params.ip_list.length; i < len; i++) {
    var ip = params.ip_list[i];
    $("#p2p_host").append('<option value="'+ip+'">'+ip+'</option>');
}

$("#webui_password").val(params.webui_server_password);
$("#btn_save_webui_password").click(function() {
        var new_password = $("#webui_password").val();
        sendRequest({
                method: "set_webui_password",
                password: new_password
        },
        // onsuccess
        function() {
            params.webui_server_password = new_password;
            reload_webui_url(params.ip_list);
            showNotification(__('webui-password-saved'), 3);
        },
        // onerror
        function(error) {
            showNotification(error, 5);
        });
});

////////////////////////////////////////////////////////////////////////////////
// "ask question" popup
$('#popup-ask').click(function() {
	$('#ask').fadeIn(500);
	$('#ask .wrap').animate({
		top: '150px'
	}, 500);
	return false;
});
function close_ask_popup()
{
    $('#ask .wrap').animate({
		top: '-100%'
	}, 500);
	$('#ask').fadeOut(500);
}
$('#ask .close').click(function() {
	close_ask_popup();
	return false;
});
$("#btn-ask-form-submit").click(function() {
        support_ask_question();
});

////////////////////////////////////////////////////////////////////////////////
// User message popup
function open_user_message_popup(message_id, title, text)
{
    $('#user-message-popup').data("message-id", message_id).fadeIn(500);
    $('#user-message-popup .widget-title h5').html(title);
    $('#user-message-popup .widget-content').html(text);
	$('#user-message-popup .wrap').animate({
		top: '150px'
	}, 500);
}

function close_user_message_popup()
{
    $('#user-message-popup .wrap').animate({
		top: '-100%'
	}, 500);
	$('#user-message-popup').fadeOut(500);
}

$('#user-message-popup .ok').click(function() {
    var message_id = $("#user-message-popup").data("message-id");
    user_messages_mark_as_read(message_id);
    close_user_message_popup();
    setTimeout(update_user_messages, 750);
    return false;
});

////////////////////////////////////////////////////////////////////////////////
// Preferred EPG languages popup
function init_preferred_epg_languages_popup()
{
    var $container = $('#preferred-epg-languages-popup .widget-content');

    get_available_epg_languages(function(avail) {
        for(var i=0; i < avail.length; i++) {
            var langId = avail[i];
            if(langId !== "auto") {
                var langName = get_lang_name(langId);
                var $checkbox = $('<input type="checkbox" class="preferred-epg-lang" id="preferred-epg-lang-'+langId+'" value="'+langId+'" />');
                if(params.preferred_epg_languages.indexOf(langId) != -1) {
                    $checkbox.prop("checked", true);
                }
                $container.append($checkbox);
                $container.append('<label for="preferred-epg-lang-'+langId+'" style="display: inline-block; margin-bottom: 0; margin-left: 5px;">'+langName+'</label>');
                $container.append('<br/>');
            }
        }
    });
}

function open_preferred_epg_languages_popup()
{
    $('#preferred-epg-languages-popup').fadeIn(500);
    $('#preferred-epg-languages-popup .wrap').animate({
        top: '150px'
    }, 500);
}

function close_preferred_epg_languages_popup()
{
    $('#preferred-epg-languages-popup .wrap').animate({
        top: '-100%'
    }, 500);
    $('#preferred-epg-languages-popup').fadeOut(500);
}

init_preferred_epg_languages_popup();

$('#preferred-epg-languages-popup .ok').click(function() {
        var langs = [];
        $("#preferred-epg-languages-popup .preferred-epg-lang:checked").each(function() {
            langs.push($(this).val());
        });

        set_preferred_epg_languages(langs);

        close_preferred_epg_languages_popup();
        return false;
});

$("#btn_change_preferred_epg_languages").on("click", function() {
    open_preferred_epg_languages_popup();
});

////////////////////////////////////////////////////////////////////////////////
// EPG popup
function open_epg_popup(channel_name, html)
{
    //disable_page_scrolling();
    $('#epg-popup-channel-name').html(channel_name);
    $('#epg-popup-content').html(html);

    $('#epg-popup').fadeIn(150, function() {
        var wrap_height = $('#epg-popup .popup2-wrap').height(),
            $content = $('#epg-popup-content');
        if(wrap_height) {
            $content.css({"height": (wrap_height-72) + "px"});
        }
    });
}

function close_epg_popup()
{
    //enable_page_scrolling();
    $('#epg-popup-content').css({"height": "auto"});
	$('#epg-popup').fadeOut(100);
}

$('#epg-popup .popup2-close').click(function() {
	close_epg_popup();
	return false;
});

function disable_page_scrolling() {
    //$("body#server").css({"overflow": "hidden"});
    $("body").bind("wheel", function(e) {
            if (!$(e.target).closest('#epg-popup-content').length) {
                e.preventDefault()
            }
    });
}

function enable_page_scrolling() {
    $("body").unbind("wheel");
    //$("body#server").css({"overflow": "auto"});
}

////////////////////////////////////////////////////////////////////////////////
// Playlist URL popup
function init_playlist_url_popup()
{
    var currentCategory = $("#filter-category").val();
    $("#playlist-url-popup .current-category-name").text(__(currentCategory));
}

function open_playlist_url_popup()
{
    init_playlist_url_popup();
    disable_page_scrolling();
    $('#playlist-url-popup').fadeIn(150, function() {
        var wrap_height = $('#playlist-url-popup .popup2-wrap').height(),
            $content = $('#playlist-url-popup-content');
        if(wrap_height) {
            $content.css({"height": (wrap_height-72) + "px"});
        }
    });
}

function close_playlist_url_popup()
{
    enable_page_scrolling();
    $('#playlist-url-popup-content').css({"height": "auto"});
    $('#playlist-url-popup').fadeOut(100);
}

$('#playlist-url-popup .popup2-close').click(function() {
    close_playlist_url_popup();
    return false;
});

$(".action-open-playlist-url-popup").on("click", function() {
    open_playlist_url_popup();
});

$("#playlist-url-popup .action-spoiler-toggle").on("click", function() {
    var $data = $("#playlist-url-popup .other-playlists");
    if($(this).data("spoiler-opened")) {
        $data.slideUp(100);
        $(this).data("spoiler-opened", false);
        $("#playlist-url-popup .spoiler-toggle").text("+");
    }
    else {
        $data.slideDown(250);
        $(this).data("spoiler-opened", true);
        $("#playlist-url-popup .spoiler-toggle").text("-");
    }

    var $content = $('#playlist-url-popup-content');
    $content.css({"height": "auto"});

    $data.promise().done(function() {
        // reinit height
        var wrap_height = $('#playlist-url-popup .popup2-wrap').height();
        if(wrap_height) {
            $content.css({"height": (wrap_height-72) + "px"});
        }
    });
});

$("#tab-create-p2p-broadcast .action-spoiler-toggle").on("click", function() {
    var $toggle = $(this);
    var targetSelector = $toggle.data("target-selector");
    var $spoiler = $(targetSelector);
    if($spoiler.data("opened")) {
        $spoiler.slideUp(100);
        $spoiler.data("opened", false);
        $toggle.find(".spoiler-toggle").text("+");
    }
    else {
        $spoiler.slideDown(250);
        $spoiler.data("opened", true);
        $toggle.find(".spoiler-toggle").text("-");
    }
});

////////////////////////////////////////////////////////////////////////////////
// Share popup
function init_share_popup(details)
{
    var $content = $('#share-popup .popup2-content'),
        itemId = details.playlist_item_id,
        infohash = details.infohash,
        playbackUrlSuffix;

    if(itemId) {
        playbackUrlSuffix = "/play/"+params.playlist_id+"/"+itemId;
    }
    else if(infohash) {
        playbackUrlSuffix = "/play/infohash/"+infohash;
    }
    else {
        throw "missing details";
    }

    // build url list
    var url_list = [];
    if(params.client_ip == "127.0.0.1") {
        // add localhost
        url = "http://127.0.0.1:"+params.http_port+playbackUrlSuffix;
        url_list.push(url);
    }

    if(allow_intranet_access) {
        if(params.ip_is_local) {
            // local ip list
            for(var j=0; j<params.ip_list.length; j++) {
                url = "http://"+params.ip_list[j]+":"+params.http_port+playbackUrlSuffix;
                url_list.push(url);
            }
        }
    }

    if(allow_remote_access) {
        if(params.external_ip) {
            // external ip
            url = "http://"+params.external_ip+":"+params.http_port+playbackUrlSuffix;
            url_list.push(url);
        }
    }

    // render url list
    var html = [];
    for(var j = 0; j < url_list.length; j++) {
        html.push('<div>');
        html.push('<a id="url-item-'+j+'" href="'+url_list[j]+'" target="_blank" class="col-left">'+url_list[j]+'</a>');
        html.push('<a href="#" title="Copy" onclick="return false;" class="clipboard-trigger-a col-right" data-target-selector="#url-item-'+j+'"></a>');
        html.push('</div>');
    }
    $content.find(".value-url-list").html(html.join(""));

    // reset
    $content.find(".value-content-id").html("");
    $content.find(".value-share-url").empty();
    $content.find(".value-html-code").empty();

    var _params = {
        method: "get_content_id",
    };

    if(itemId) {
        _params['playlist_item_id'] = itemId;
    }
    else if(infohash) {
        _params['infohash'] = infohash;
    }

    sendRequest(
        _params,
        // onsuccess
        function(response) {
            if(response && response.content_id) {
                var contentId = response.content_id;

                // content id
                var $span = $("<span>");
                $span.attr("id", "content-id-" + itemId);
                $span.text(contentId);
                $content.find(".value-content-id")
                    .append($span)
                    .append('<a href="#" title="Copy" onclick="return false;" class="clipboard-trigger-a col-right" data-target-selector="#content-id-'+itemId+'"></a>');

                // share url
                var $shareUrl = $("<a>"),
                    url = "http://avod.me/play/" + contentId;
                $shareUrl.attr("id", "share-url-" + itemId);
                $shareUrl.attr("href", url);
                $shareUrl.attr("target", "_blank");
                $shareUrl.text(url);
                $content.find(".value-share-url")
                .empty()
                .append($shareUrl)
                .append('<a href="#" title="Copy" onclick="return false;" class="clipboard-trigger-a col-right" data-target-selector="#share-url-'+itemId+'"></a>');

                // embed code
                var $code = $('<textarea>');
                $code.attr("id", "html-code-" + itemId);
                $code.val('<iframe src="http://acestream.org/embed/'+contentId+'" width="800" height="400" />');
                $code.prop("readonly", true);
                $content.find(".value-html-code")
                    .append($code)
                    .append('<a href="#" title="Copy" onclick="return false;" class="clipboard-trigger-a col-right" data-target-selector="#html-code-'+itemId+'"></a>');
            }
        }
    );
}
function open_share_popup(details)
{
    init_share_popup(details);
    disable_page_scrolling();
    $('#share-popup').fadeIn(150, function() {
        var $content = $('#share-popup .popup2-content');
        var wrap_height = $('#share-popup .popup2-wrap').height();
        if(wrap_height) {
            $content.css({"height": (wrap_height-72) + "px"});
        }
    });
}

function close_share_popup()
{
    enable_page_scrolling();
    $('#share-popup .popup2-content').css({"height": "auto"});
    $('#share-popup').fadeOut(100);
}

$('#share-popup .popup2-close').click(function() {
    close_share_popup();
    return false;
});

////////////////////////////////////////////////////////////////////////////////
// Content id popup
function open_content_id_popup(anchor, playlist_item_id)
{
    $("#content-id-popup-value").html(__("loading..."));
    sendRequest({
        method: "get_content_id",
        playlist_item_id: playlist_item_id
        },
        // onsuccess
        function(response) {
            $("#content-id-popup-value").html(response.content_id);
        }
    );

    var offset = $(anchor).offset(),
        top = Math.round(offset.top) - 63,
        left = Math.round(offset.left) - 203;

    $('#content-id-popup').css({
            top: top + "px",
            left: left + "px"
    });
    $('#content-id-popup').fadeIn(150);
}

function close_content_id_popup()
{
	$('#content-id-popup').fadeOut(100);
}

$('#content-id-popup .popup3-close').click(function() {
	close_content_id_popup();
	return false;
});

////////////////////////////////////////////////////////////////////////////////
// Init plugins

$("#sub-header").sticky({topSpacing:0});
$("#tabs").tabs();
$("#share-popup .tabs").tabs();

// navigation
window.addEventListener("popstate", function(e) {
        if(e.state && e.state.pageId) {
            show_page(e.state.pageId, true);
        }
});

////////////////////////////////////////////////////////////////////////////////
// Final init

// register background task actions and category
backgroundTaskCategory = "";
backgroundTaskActions["reload_playlist"] = reload_playlist;
backgroundTaskActions["reload_external_playlists"] = reload_external_playlists;
backgroundTaskActions["reload_broadcast_list"] = reload_broadcast_list;
backgroundTaskActions["reload_external_hls_playlists"] = reload_external_hls_playlists;
if(params.epg_enabled) {
    backgroundTaskActions["reload_epg_sources"] = reload_epg_sources;
}
update_background_tasks();

reload_playlist_url(params.ip_list);
reload_webui_url(params.ip_list);
reload_playlist();
reload_playlist_trash();
update_subcategories();
reload_external_playlists();
update_subcategories_cache_for_current_category();
if(params.epg_enabled) {
    reload_epg_sources();
    if(params.dev_mode) {
        reload_system_epg_sources();
    }
}

reload_broadcast_list();
reload_external_hls_playlists();

update_user_messages();

// load remote content
load_remote_content();

// update server settings
update_settings();

// set current search type
update_search_type();

$(".cbp-spmenu").mCustomScrollbar({
    axis: "y",
    theme: "dark"
});

// update visible playlist items
setInterval(update_visible_playlist_items, 10000);

// select default page
var load_default_page = true;
if(location.hash.length > 0) {
    try {
        show_page(location.hash.substring(1, location.hash.length), false, true);
        load_default_page = false;
    }
    catch(e) {
    }
}

if(load_default_page) {
    if(params.initial_page_id) {
        show_page(params.initial_page_id, false, true);
    }
    else {
        show_page("proxy-server-main", false, true);
    }
}

update_active_quick_nav();

//
$.ajax({
    url: 'https://auth3.acestream.net/c',
    type: 'GET',
    dataType: 'json',
    cache: false,
    data: {
        a: "engine-webui",
        b: 1,
        c: 1
    },
    xhrFields: {
        withCredentials: true
    },
    timeout: 60000,
    error: function(request, error_string, exception) {
    },
    success: function(response) {
        if(response && response.a === 1) {
            params.allow_remote_search = true;
            $(".visible-when-search-enabled").removeClass("hidden");
        }
    }
});