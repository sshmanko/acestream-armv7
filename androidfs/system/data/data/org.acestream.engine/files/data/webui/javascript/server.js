var backgroundTaskActions = {},
    backgroundTaskCategory = null,
    backgroundTaskSuppressErrors = false,
    activeBackgroundTasks = {},
    notificationSequence = 0,
    debugBackgroundTasks = false,
    debugNotifications = false;

function now() {
    if(Date.now) {
        return Date.now();
    }
    else {
        return new Date().getTime();
    }
}

function open_window(url, params) {
    var first = true;
    for(var p in params) {
        if(first) {
            url += "?";
            first = false;
        }
        else {
            url += "&";
        }
        url += p + "=" + encodeURIComponent(params[p]);
    }

    window.open(
        url,
        'remote-control-' + Math.random(),
        'height=550,width=500,toolbar=no,menubar=no,scrollbars=no,resizable=yes,location=no,directories=no,status=no'
        );
}

function sendRequest(data, onsuccess, onfailure, timeout) {
    data = data || {};
    data.token = params.access_token;
    if(timeout === undefined || isNaN(timeout)) {
        timeout = 60000;
    }
    var ajaxSettings = {
        url: '/server/api/',
        type: 'GET',
        dataType: 'json',
        cache: false,
        data: data,
        timeout: timeout,
        error: function(request, error_string, exception) {
            if(typeof onfailure === 'function') {
                onfailure.call(null, error_string);
            }
        },
        success: function(response) {
            if(typeof response != 'object') {
                alert("Malformed response");
            }

            if(response.result) {
                if(typeof onsuccess === 'function') {
                    onsuccess.call(null, response.result);
                }
            }
            else {
                if(typeof onfailure === 'function') {
                    onfailure.call(null, response.error);
                }
            }
        }
    };

    $.ajax(ajaxSettings);
}

function update_background_tasks()
{
    if(!backgroundTaskCategory) {
        setTimeout(update_background_tasks, 1000);
        return;
    }

    var request = {
        method: "get_background_tasks",
        category: backgroundTaskCategory,
    };
    var startTime = now();
    sendRequest(
        request,
        // onsuccess
        function(response) {
            var i, j, message_text, task_id, task, timeout = 0, expires_at = 0, currentTasks = {};
            for(i=0; i<response.length; i++) {
                task = response[i];

                if(debugBackgroundTasks)
                    console.log("got bg task: id=" + task.id + " msg=" + task.msg + " timeout=" + task.timeout + " actions=" + task.actions + " active", activeBackgroundTasks);

                if(task.msg) {
                    message_text = task.msg;
                    task_id = task.id;
                    if(task.timeout && task.timeout > timeout) {
                        timeout = task.timeout;
                    }
                }

                expires_at = now() + timeout;
                activeBackgroundTasks[task.id] = expires_at;
                currentTasks[task.id] = 1;

                if(task.actions && task.actions.length) {
                    for(j=0; j<task.actions.length; j++) {
                        var action = task.actions[j];
                        if(typeof backgroundTaskActions[action] === 'function') {
                            backgroundTaskActions[action].call(null);
                        }
                    }
                }
            }

            if(message_text) {
                showNotification(message_text, timeout, task_id);
            }

            // hide expired tasks
            for(task_id in activeBackgroundTasks) {
                if(currentTasks[task_id] === 1) {
                    continue;
                }
                expires_at = activeBackgroundTasks[task_id];
                var expires_after = expires_at - now();
                if(expires_after <= 0) {
                    if(debugBackgroundTasks) {
                        console.log("got expired task: id=" + task_id + " expires_after=" + expires_after);
                    }
                    hideNotification(task_id);
                    delete activeBackgroundTasks[task_id];
                }
                else {
                    if(debugBackgroundTasks) {
                        console.log("leave task: id=" + task_id + " expires_after=" + expires_after);
                    }
                }
            }

            setTimeout(update_background_tasks, 1000);
        },
        // onfailure
        function(error) {
            var age = now() - startTime,
                interval = (age >= 1000) ? 0 : 1000;
            setTimeout(update_background_tasks, interval);
        }
    );
}

function showNotification(msg, timeout, task_id) {
    if(typeof task_id === 'undefined') {
        task_id = 0;
    }
    $("#notification").data("task-id", task_id).html(msg).show();
    ++notificationSequence;
    if(debugNotifications)
        console.log("show notification: seq=" + notificationSequence + " timeout=" + timeout);
    if(timeout) {
        // hide after |timeout| seconds if no other showNotification was called
        var seq = notificationSequence;
        setTimeout(function() {
                if(notificationSequence == seq) {
                    if(debugNotifications)
                        console.log("notification timeout: hide: seq=" + seq);
                    hideNotification();
                }
                else {
                    if(debugNotifications)
                        console.log("notification timeout: skip hide: seq=" + seq);
                }

        }, timeout*1000);
    }
}

function hideNotification(task_id) {
    if(task_id) {
        var active_task_id = $("#notification").data("task-id");
        if(debugBackgroundTasks) {
            console.log("hideNotification: id=" + task_id + " active_id=" + active_task_id);
        }
        if(task_id != active_task_id) {
            return;
        }
    }
    $("#notification").data("task-id", 0).html("").hide();
}

function hide_sliding_menu(force) {
    if(force || can_hide_sliding_menu_) {
        $(".cbp-spmenu").removeClass("cbp-spmenu-open");
        update_active_quick_nav();
    }
}

function update_active_quick_nav() {
    $(".quick-nav-button").removeClass("active");
    $(".quick-nav-button.current").addClass("active");
}

function set_current_quick_nav(button_id)
{
    $(".quick-nav-button").removeClass("current");
    $(".quick-nav-button[data-button-id="+button_id+"]").addClass("current");
    update_active_quick_nav();
}

function set_quick_nav(button_id, menu_id, icon_class)
{
    var $button = $(".quick-nav-button[data-button-id="+button_id+"]");
    $button.data("id", menu_id);
    $button.find("a i").removeClass().addClass("icon").addClass(icon_class);
}

function show_sidebar(id)
{
    var found = false;

    $("#static-sidebar-container .static-sidebar").each(function() {
            if($(this).data("id") == id) {
                found = true;
                $(this).show();
            }
            else {
                $(this).hide();
            }
    });

    if(found) {
        $("#content").removeClass("no-sidebar");
        $("#static-sidebar-container").show();
    }
    else {
        $("#content").addClass("no-sidebar");
        $("#static-sidebar-container").hide();
    }
}

function hide_sidebar()
{
    $("#content").addClass("no-sidebar");
    $("#static-sidebar-container").hide();
}

function show_page(page_id, details) {
    var tab_id = 0,
        breadcrumb_path = [],
        main_page_id = null,
        sidebar_id = null,
        quick_nav_menu_id = null,
        quick_nav_icon = null,
        details = details || {},
        skip_history = details.skip_history,
        replace_history_state = details.replace_history_state,
        page_params = details.params;

    if(page_id == "broadcasting-add-hls") {
        // it's a virtual page
        page_id = current_hls_broadcast_create_page_;
    }
    else if(page_id == "proxy-server-epg-sources" && !params.epg_enabled) {
        page_id == "proxy-server-playlist"
    }

    if(page_id == "proxy-server-playlist") {
        tab_id = 0;
        main_page_id = "proxy-server-main";
        breadcrumb_path.push({title: 'proxy-server', pageId: "proxy-server-main"});
        breadcrumb_path.push({title: 'playlist'});
        quick_nav_menu_id = "proxy-server";
        quick_nav_icon = "icon-proxy";
        support_ask_category_ = 3;
        backgroundTaskCategory = "content";
    }
    else if(page_id == "proxy-server-settings") {
        tab_id = 1;
        main_page_id = "proxy-server-main";
        breadcrumb_path.push({title: 'proxy-server', pageId: "proxy-server-main"});
        breadcrumb_path.push({title: 'parameters'});
        quick_nav_menu_id = "proxy-server";
        quick_nav_icon = "icon-proxy";
        support_ask_category_ = 3;
        backgroundTaskCategory = "content";
    }
    else if(page_id == "proxy-server-add-item") {
        tab_id = 2;
        main_page_id = "proxy-server-main";
        breadcrumb_path.push({title: 'proxy-server', pageId: "proxy-server-main"});
        breadcrumb_path.push({title: 'adding-content'});
        quick_nav_menu_id = "proxy-server";
        quick_nav_icon = "icon-proxy";
        support_ask_category_ = 3;
        backgroundTaskCategory = "content";
    }
    else if(page_id == "proxy-server-imported-playlists") {
        tab_id = 3;
        main_page_id = "proxy-server-main";
        breadcrumb_path.push({title: 'proxy-server', pageId: "proxy-server-main"});
        breadcrumb_path.push({title: 'imported-playlist'});
        quick_nav_menu_id = "proxy-server";
        quick_nav_icon = "icon-proxy";
        support_ask_category_ = 3;
        backgroundTaskCategory = "content";

        $("#add-external-playlist-name").val("");
        $("#add-external-playlist-url").val("");
        $("#playlist-upload-form").data("mode", "import");
        $("#playlist-upload-form .widget-title h5").data("string-id", "add-new-playlist").html(__('add-new-playlist'));
        $("#btn-add-external-playlist").data("string-id", "add-btn").val(__("add-btn"));
        $("#add-external-playlist-url").prop("disabled", false);
        $("#external-playlists-container").show();
        $("#playlist-upload-form .field-select-file").show();
    }
    else if(page_id == "media-server-add-playlist") {
        tab_id = 3;
        main_page_id = "proxy-server-main";
        breadcrumb_path.push({title: 'proxy-server', pageId: "proxy-server-main"});
        breadcrumb_path.push({title: 'add-playlist'});
        quick_nav_menu_id = "proxy-server";
        quick_nav_icon = "icon-proxy";
        support_ask_category_ = 3;
        backgroundTaskCategory = "content";

        $("#add-external-playlist-name").val("");
        $("#add-external-playlist-url").val("");
        $("#playlist-upload-form").data("mode", "add");
        $("#playlist-upload-form .widget-title h5").data("string-id", "add-new-playlist").html(__('add-new-playlist'));
        $("#btn-add-external-playlist").data("string-id", "add-btn").val(__("add-btn"));
        $("#add-external-playlist-url").prop("disabled", false);
        $("#external-playlists-container").hide();
        $("#playlist-upload-form .field-select-file").show();
    }
    else if(page_id == "media-server-edit-playlist") {
        tab_id = 3;
        main_page_id = "proxy-server-main";
        breadcrumb_path.push({title: 'proxy-server', pageId: "proxy-server-main"});
        breadcrumb_path.push({title: 'add-playlist'});
        quick_nav_menu_id = "proxy-server";
        quick_nav_icon = "icon-proxy";
        support_ask_category_ = 3;
        backgroundTaskCategory = "content";

        $("#playlist-upload-form").data("mode", "edit");
        $("#playlist-upload-form").data("playlist-id", page_params.playlist_id);
        $("#playlist-upload-form .widget-title h5").data("string-id", "edit-playlist").html(__('edit-playlist'));
        $("#btn-add-external-playlist").data("string-id", "save").val(__("save"));
        $("#add-external-playlist-url").prop("disabled", true);
        $("#external-playlists-container").hide();
        $("#playlist-upload-form .field-select-file").hide();
    }
    else if(page_id == "proxy-server-recycle-bin") {
        tab_id = 4;
        main_page_id = "proxy-server-main";
        breadcrumb_path.push({title: 'proxy-server', pageId: "proxy-server-main"});
        breadcrumb_path.push({title: 'recycle'});
        quick_nav_menu_id = "proxy-server";
        quick_nav_icon = "icon-proxy";
        support_ask_category_ = 3;
        backgroundTaskCategory = "content";
    }
    else if(page_id == "broadcasting-create-p2p") {
        tab_id = 5;
        main_page_id = "broadcasting-main";
        breadcrumb_path.push({title: 'broadcasting', pageId: "broadcasting-main"});
        breadcrumb_path.push({title: 'new-p2p-broadcast'});
        quick_nav_menu_id = "broadcasting";
        quick_nav_icon = "icon-broadcast";
        support_ask_category_ = 4;
        backgroundTaskCategory = "broadcast";
    }
    else if(page_id == "broadcasting-add-hls-single") {
        tab_id = 6;
        main_page_id = "broadcasting-main";
        breadcrumb_path.push({title: 'broadcasting', pageId: "broadcasting-main"});
        breadcrumb_path.push({title: 'new-hls-broadcast'});
        current_hls_broadcast_create_page_ = page_id;
        sidebar_id = "broadcasting-add-hls";
        quick_nav_menu_id = "broadcasting";
        quick_nav_icon = "icon-broadcast";
        support_ask_category_ = 4;
        $(".static-sidebar[data-id=broadcasting-add-hls] li[data-id!=broadcasting-add-hls-single]").removeClass("active");
        $(".static-sidebar[data-id=broadcasting-add-hls] li[data-id=broadcasting-add-hls-single]").addClass("active");
        backgroundTaskCategory = "broadcast";
    }
    else if(page_id == "broadcasting-add-hls-playlist") {
        tab_id = 7;
        main_page_id = "broadcasting-main";
        breadcrumb_path.push({title: 'broadcasting', pageId: "broadcasting-main"});
        breadcrumb_path.push({title: 'imported-playlist'});
        current_hls_broadcast_create_page_ = page_id;
        sidebar_id = "broadcasting-add-hls";
        quick_nav_menu_id = "broadcasting";
        quick_nav_icon = "icon-broadcast";
        support_ask_category_ = 4;
        $(".static-sidebar[data-id=broadcasting-add-hls] li[data-id!=broadcasting-add-hls-playlist]").removeClass("active");
        $(".static-sidebar[data-id=broadcasting-add-hls] li[data-id=broadcasting-add-hls-playlist]").addClass("active");
        backgroundTaskCategory = "broadcast";
    }
    else if(page_id == "broadcasting-my-broadcasts") {
        tab_id = 8;
        main_page_id = "broadcasting-main";
        breadcrumb_path.push({title: 'broadcasting', pageId: "broadcasting-main"});
        breadcrumb_path.push({title: 'my-broadcasts'});
        quick_nav_menu_id = "broadcasting";
        quick_nav_icon = "icon-broadcast";
        support_ask_category_ = 4;
        backgroundTaskCategory = "broadcast";
    }
    else if(page_id == "proxy-server-main") {
        tab_id = 9;
        breadcrumb_path.push({title: 'proxy-server'});
        sidebar_id = "proxy-server-main";
        quick_nav_menu_id = "proxy-server";
        quick_nav_icon = "icon-proxy";
        support_ask_category_ = 3;
        backgroundTaskCategory = "content";
    }
    else if(page_id == "broadcasting-main") {
        tab_id = 10;
        breadcrumb_path.push({title: 'broadcasting'});
        sidebar_id = "broadcasting-main";
        quick_nav_menu_id = "broadcasting";
        quick_nav_icon = "icon-broadcast";
        support_ask_category_ = 4;
        backgroundTaskCategory = "broadcast";
    }
    else if(page_id == "user-messages") {
        tab_id = 11;
        breadcrumb_path.push({title: 'user-messages'});
        user_messages_mark_all_as_read();
    }
    else if(page_id == "proxy-server-epg-sources") {
        tab_id = 12;
        main_page_id = "proxy-server-main";
        breadcrumb_path.push({title: 'proxy-server', pageId: "proxy-server-main"});
        breadcrumb_path.push({title: 'program-guide-epg'});
        quick_nav_menu_id = "proxy-server";
        quick_nav_icon = "icon-proxy";
        support_ask_category_ = 3;
        backgroundTaskCategory = "content";
    }
    else if(page_id == "proxy-server-settings-info") {
        tab_id = 13;
        main_page_id = "proxy-server-main";
        breadcrumb_path.push({title: 'proxy-server', pageId: "proxy-server-main"});
        breadcrumb_path.push({title: 'info-panel'});
        quick_nav_menu_id = "proxy-server";
        quick_nav_icon = "icon-proxy";
        support_ask_category_ = 3;
        backgroundTaskCategory = "content";
    }
    else if(page_id == "media-server-sync") {
        tab_id = 14;
        main_page_id = "proxy-server-main";
        breadcrumb_path.push({title: 'proxy-server', pageId: "proxy-server-main"});
        breadcrumb_path.push({title: 'sync'});
        quick_nav_menu_id = "proxy-server";
        quick_nav_icon = "icon-proxy";
        support_ask_category_ = 3;
        backgroundTaskCategory = "content";
    }
    else {
        var msg = "unknown page id: " + page_id;
        console.log(msg);
        throw msg;
    }

    if(sidebar_id) {
        show_sidebar(sidebar_id);
    }
    else {
        hide_sidebar();
    }

    // if(quick_nav_menu_id && quick_nav_icon) {
    //     set_quick_nav(4, quick_nav_menu_id, quick_nav_icon);
    // }
    if(quick_nav_menu_id == "broadcasting") {
        set_current_quick_nav(3);
    }
    else {
        set_current_quick_nav(4);
    }

    $("#tabs").tabs("option", "active", tab_id);
    set_breadcrumb_path(breadcrumb_path);

    if(!skip_history && window.history && window.history.pushState) {
        var state = {pageId: page_id},
            url = "#" + page_id;
        if(replace_history_state) {
            window.history.replaceState(state, null, url);
        }
        else {
            window.history.pushState(state, null, url);
        }
    }

    // redirect forms to new page
    $(".redirect-url").val(window.location.pathname + "#" + page_id);

    // update help link
    //$("#help-link").attr("href", "https://accounts.acestream.net/help/category/" + page_id);

    if(main_page_id) {
        $("#help-link").attr("href", "#" + main_page_id);
    }
    if(page_id == "broadcasting-main" || page_id == "proxy-server-main") {
        $("#help-link").hide();
    }
    else {
        $("#help-link").show();
    }

    // allow info and ask buttons on explicitly allowed pages only
    if(params.allow_info_button && (params.allow_info_button === "_all_" || params.allow_info_button.indexOf(page_id) !== -1)) {
        //$("#help-link").show();
        $("#popup-ask").show();
    }
    else {
        //$("#help-link").hide();
        $("#popup-ask").hide();
    }

    // set ask form category
    $("#ask-form-category option[value='"+support_ask_category_+"']").prop('selected', true);

    current_page_ = page_id;
    update_active_quick_nav();
}

function set_breadcrumb_path(path) {
    $("#breadcrumb-path").empty();
    for(var i=0, len=path.length; i < len; i++) {
        var $a = $('<a href="#">');
        var item = path[i];
        $a.html(__(item.title));
        $a.addClass("translate");
        $a.data("string-id", item.title);
        if(item.pageId) {
            $a.data("page-id", item.pageId);
        }
        $a.click(function() {
                var page_id = $(this).data("page-id");
                if(page_id) {
                    show_page(page_id);
                }
                return false;
        });
        $("#breadcrumb-path").append($a);
    }
}

function load_remote_content()
{
    load_remote_content_once();
    setTimeout(function() {
            load_remote_content();
    }, 43200000);
}

function load_remote_content_once(tries) {
    var i, j, len, jlen,
        max_tries = 5,
        retry_interval = 5000,
        tries = tries || 0;

    var info_blocks = [],
        promo_blocks = [],
        lists = ["ask-form-category"];

    $(".remote-info-block").each(function() {
            var service_id = $(this).data("id");
            if(service_id) {
                info_blocks.push(service_id);
            }
    });

    if(params.user_services.indexOf("proxyServer") === -1) {
        promo_blocks.push("proxyServer");
    }

    var request_data = {
        v: params.version_code,
        locale: params.locale,
        info_blocks: info_blocks.join(","),
        promo_blocks: promo_blocks.join(","),
        lists: lists.join(","),
    };
    $.ajax({
        url: 'http://content-p.acestream.net/getcontent',
        type: 'GET',
        dataType: 'jsonp',
        cache: false,
        data: request_data,
        timeout: 60000,
        error: function(request, error_string, exception) {
            tries += 1;
            if(tries < max_tries) {
                setTimeout(function() {
                        load_remote_content_once(info_blocks, promo_blocks, lists, tries);
                }, retry_interval);
            }
        },
        success: function(response) {
            if(response.promo_blocks) {
                for(i=0,len=response.promo_blocks.length; i<len; i++) {
                    $(".promo-block[data-id="+response.promo_blocks[i].id+"]").html(response.promo_blocks[i].html);
                }
            }
            if(response.info_blocks) {
                for(i=0,len=response.info_blocks.length; i<len; i++) {
                    $(".remote-info-block[data-id="+response.info_blocks[i].id+"]").html(response.info_blocks[i].html);
                }
            }
            if(response.lists) {
                for(i=0,len=response.lists.length; i<len; i++) {
                    var list = response.lists[i],
                        $list = $("#" + list.id);
                    $list.empty();
                    for(j=0, jlen=list.items.length; j<jlen; j++) {
                        $list.append('<option value="'+list.items[j].id+'">'+list.items[j].name+'</option>');
                    }

                    if(list.id == "ask-form-category") {
                        $("#ask-form-category option[value='"+support_ask_category_+"']").prop('selected', true);
                    }
                }
            }
            if(response.info_string) {
                // hide marquee for 1 second to give time to init
                var $e = $("#info-string");
                $e.css({top: "-9999px"}).html(response.info_string.html);
                setTimeout(function() {
                        $e.css({top: "37px"});
                }, 1000);
            }
        }
    });
}

function support_ask_question()
{
    sendRequest({
            method: "support_ask_question",
            category: $("#ask-form-category").val(),
            email: $("#ask-form-email").val().trim(),
            text: $("#ask-form-text").val().trim(),
            },
            // onsuccess
            function(response) {
                close_ask_popup();
            }
        );
    return true;
}

function request_file_path()
{
    sendRequest({
            method: "request_file_path",
            },
            // onsuccess
            function(response) {
                console.log(response);
            },
            // onfailure
            function() {
            },
            // timeout
            300000
        );
    return true;
}

function play_item(details) {
    if(params.client_ip != "127.0.0.1") {
        // open link in browser
        return true;
    }

    open_in_player(details, -1);
    return false;
}

function get_available_players(details)
{
    var _params = {
        method: "get_available_players",
    };

    if(details.playlist_item_id) {
        _params['playlist_item_id'] = details.playlist_item_id;
    }
    else if(details.infohash) {
        _params['infohash'] = details.infohash;
    }
    else {
        throw "missing details";
    }

    sendRequest(
            _params,
            // onsuccess
            function(response) {
                var $container = $("#" + details.container_id);
                $container.empty();
                for(var i = 0; i < response.players.length; i++) {
                    var player = response.players[i];
                    var icon = "";
                    if(player.icon) {
                        icon = '<img src="'+player.icon+'" />';
                    }
                    var $item = $('<li><a href="#">'+player.name+'</a>'+icon+'</li>');
                    $item.data("player-id", player.id);
                    $item.data("player-type", player.type);
                    $item.click(function() {
                            open_in_player(
                                details,
                                $(this).data("player-id"),
                                $(this).data("player-type")
                                );
                            $container.parent().removeClass("open");
                            return false;
                    });
                    $container.append($item);
                }
                // for testing
                // $container.show();
            },
            // onfailure
            function(error) {
                showNotification(error, 5);
            }
        );
    return true;
}

function open_in_player(details, player_id, player_type)
{
    if("aircast" === player_type) {
        // redirect to remote control page
        var _params = {
            device_id: player_id,
            autoplay: "yes",
        };

        if(details.playlist_item_id) {
            _params['playlist_item_id'] = details.playlist_item_id;
        }
        else if(details.infohash) {
            _params['infohash'] = details.infohash;
        }
        else {
            throw "missing details";
        }

        open_window("/remote-control", _params);
    }
    else {
        var _params = {
            method: "open_in_player",
            player_id: player_id
        };

        if(details.playlist_item_id) {
            _params['playlist_item_id'] = details.playlist_item_id;
        }
        else if(details.infohash) {
            _params['infohash'] = details.infohash;
        }
        else {
            throw "missing details";
        }

        sendRequest(
                _params,
                // onsuccess
                function(response) {
                },
                // onfailure
                function(error) {
                    showNotification(error, 5);
                }
            );
    }
    return true;
}

function show_context_menu(items, left, top)
{
    var i, len, $item, $menu = $("#context-menu");
    $menu.empty();
    for(i=0, len=items.length; i<len; i++) {
        $item = $("<a>");
        $menu.append($item);
    }
    $menu.css({top: top+"px", left: left+"px"}).show();
}

function update_user_messages()
{
    sendRequest({
            method: "user_messages_get",
            },
            // onsuccess
            function(response) {
                var msg,
                    got_popup = false,
                    count_unread = 0,
                    $container = $("#user-messages-container");

                $container.empty();
                for(var message_id in response.messages) {
                    msg = response.messages[message_id];

                    if(!msg.read) {
                        ++count_unread;
                        if(!got_popup && msg.popup) {
                            got_popup = true;
                            open_user_message_popup(msg.id, msg.title, msg.msg);
                        }
                    }

                    var $item = $('<div>').addClass("user-message-item"),
                        $date = $('<div>').addClass("user-message-date"),
                        $title = $('<div>').addClass("user-message-title"),
                        $text = $('<div>').addClass("user-message-text");

                    $title.text(msg.title);
                    $date.text(msg.date);
                    $text.html(msg.msg);
                    $item.append($title).append($date).append($text);
                    $item.data("message-id", msg.id);

                    $container.append($item);
                }

                if(count_unread == 0) {
                    $(".user-messages-unread-count").html("0").hide();
                }
                else {
                    $(".user-messages-unread-count").html(count_unread).show();
                }
            },
            // onfailure
            function(error) {
                console.log("failed to update user messages: " + error);
            }
        );
    // update in 10 minutes
    setTimeout(update_user_messages, 600000);
}

function user_messages_mark_as_read(message_id)
{
    sendRequest({
            method: "user_messages_mark_as_read",
            message_id: message_id
            },
            // onsuccess
            function(response) {
            },
            // onfailure
            function(error) {
            }
        );
}

function user_messages_mark_all_as_read()
{
    $(".user-messages-unread-count").html("0").hide();
    sendRequest({
            method: "user_messages_mark_all_as_read",
            },
            // onsuccess
            function(response) {
            },
            // onfailure
            function(error) {
            }
        );
}

function set_locale(locale)
{
    sendRequest({
            method: "set_locale",
            locale: locale
            },
            // onsuccess
            function(response) {
                params.locale = locale;
                reload_locale();
            },
            // onfailure
            function(error) {
                showNotification(error, 5);
            }
        );
}

function update_current_locale()
{
    var localeNames = {
        'en_EN': 'EN',
        'ru_RU': 'RU',
    };

    if(localeNames[params.locale] === undefined) {
        params.locale = "en_EN";
    }

    $("#current-locale-name-short").html(localeNames[params.locale]);
}

function reload_locale(skip_remote_content_reload)
{
    update_current_locale();
    if(!skip_remote_content_reload) {
        load_remote_content_once();
    }
    $(".translate").each(function() {
            var attr = $(this).data("translate-attr"),
                value = __($(this).data("string-id")),
                suffix = $(this).data("string-suffix");

            if(suffix) {
                value += suffix;
            }

            if(attr) {
                $(this).attr(attr, value);
            }
            else {
                $(this).html(value);
            }
    });
}

function update_settings()
{
    sendRequest({
            method: "get_server_settings",
            },
            // onsuccess
            function(response) {
                var prev_locale = params.locale,
                    prev_media_owner = params.current_media_owner;

                $.extend(params, response);

                if(prev_locale !== params.locale) {
                    // locale changed
                    reload_locale(true);
                }

                if(prev_media_owner !== params.current_media_owner) {
                    // media owner changed
                    media_owner_changed();
                }

                // show/hide remote control
                if(params.remote_control_enabled) {
                    $(".visible-when-remote-control-enabled").removeClass("hidden");
                }
                else {
                    $(".visible-when-remote-control-enabled").addClass("hidden");
                }

                setTimeout(update_settings, 5000);
            },
            // onfailure
            function(error) {
                setTimeout(update_settings, 5000);
            }
        );
}

function open_remote_control()
{
    open_window("/remote-control", {
        use_last_session: 1
    });
}

function get_available_epg_languages(callback)
{
    sendRequest(
        {
            method: "get_available_epg_languages"
        },
        // onsuccess
        function(response) {
            if(typeof callback == "function") {
                callback(response);
            }
        });
}

function get_language_names()
{
    var ajaxSettings = {
        url: '/webui/javascript/languages.json',
        type: 'GET',
        dataType: 'json',
        cache: false,
        success: function(response) {
            languageNames = response;
        }
    };

    $.ajax(ajaxSettings);
}

function media_owner_changed() {
    reload_playlist();
    reload_playlist_trash();
    update_subcategories();
    reload_external_playlists();
    if(params.epg_enabled) {
        reload_epg_sources();
    }

    reload_broadcast_list();
    reload_external_hls_playlists();
}