var RemoteControl = (function() {
    var ENGINE_UPDATE_INTERVAL = 1000;
    var PLAYBACK_START_TIMEOUT = 125000;
    var DEVICE_UPDATE_INTERVAL = 1000;
    var HLS_MIME_TYPE = "application/vnd.apple.mpegurl";
    var USER_ACTIVITY_TIMEOUT = 65000;
    var EVENTS_UPDATE_INTERVAL = 5000;

    var ContentType = {
        VOD: "vod",
        LIVE: "live",
    };

    var DeviceProtocol = {
        AIRPLAY: "airplay",
        CHROMECAST: "chromecast",
    };

    var DeviceStatus = {
        PLAYING: 'playing',
        PAUSED: 'paused',
        UNKNOWN: 'unknown',
        IDLE: 'idle',
        BUFFERING: 'buffering',
        FINISHED: 'finished',
        DISCONNECTED: 'disconnected',
    };

    var PlayState = {
        PLAYING: 'playing',
        PAUSED: 'paused',
        IDLE: 'idle'
    };

    var gPageId = guid();
    var gParams = {};
    var gCurrentDevice = null;
    var gLastSelectedDevice = null;
    var gEngineSession = null;
    var gMessages = {};
    var gCurrentMsg = null;
    var gPrebuffering = false;
    var gActive = true;
    var gWaitReconnect = false;
    var gPlaybackStarted = false;
    var gPlaybackRestarted = false;

    var gDeviceStatus = {
        status: DeviceStatus.UNKNOWN,
        volume: 0,
        position: 0,
        duration: 0,
        lastSeenAt: 0,
        lastPlayingAt: 0,
        seekOnStart: 0,
    };

    var gEngineStatus = {
        status: '',
        progress: 0,
        peers: 0,
        download: 0,
        upload: 0,
    };

    var gPlaylist = {
        loaded: false,
        contentDescriptor: null,
        items: [],
        currentItemIndex: -1,
    };

    var gTimers = {
        playbackStartTimer: null,
        deviceStatusTimer: null,
        engineStatusTimer: null,
        userActivityTimer: null,
        eventsTimer: null,
    };

    var gVolumeBar = null,
        gProgressBar = null;

    function debug() {
        if(gParams.debug) {
            console.log.apply(console, arguments);
        }
    }

    function verbose() {
        if(gParams.verbose) {
            console.log.apply(console, arguments);
        }
    }

    function showToast(msg) {
        $("#toast").text(msg).show();
        if(gTimers.toastCloseTimer) {
            clearTimeout(gTimers.toastCloseTimer);
        }
        gTimers.toastCloseTimer = setTimeout(function() {
            $("#toast").hide();
        }, 5000);
    }

    function initSeekbars() {
        gVolumeBar = new Seekbar.Seekbar({
            renderTo: "#volume-bar",
            minValue: 0,
            maxValue: 100,
            barSize: 2,
            needleSize: 0.1,
            thumbColor: "#62c6c7",
            negativeColor : '#62c6c7',
            positiveColor : '#888',
            value: 0,
            valueListener: function(value, enddrag) {
                if(enddrag) {
                    debug("volume changed: value=" + value + " enddrag=" + enddrag);
                    hideMessage("volume");
                    sendCommand("aircast_set_volume", {
                        value: value / 100.0
                    });
                }
                else {
                    showMessage("volume", 100, Math.round(value) + "%", 72);
                }
            }
        });

        gProgressBar = new Seekbar.Seekbar({
            renderTo: "#progress-bar",
            minValue: 0,
            maxValue: 100,
            barSize: 2,
            needleSize: 0.1,
            value: 0,
            thumbColor: "#62c6c7",
            negativeColor : '#62c6c7',
            positiveColor : '#888',
            valueListener: function(value, enddrag) {
                if(enddrag) {
                    debug("progress changed: value=" + value + " enddrag=" + enddrag);
                    hideMessage("progress");
                    seek(value);
                }
                else {
                    var timeString = seconds2time(value);
                    showMessage("progress", 100, timeString, 48);
                }
            },
            hoverListener: function(value) {
                if(value === null) {
                    $("#text-position").text(seconds2time(gDeviceStatus.position));
                }
                else {
                    $("#text-position").text(seconds2time(value));
                }
            }
        });
    }

    function initActivityMonitor() {
        $("body").on("mousemove", function() {
            gActive = true;
            if(gTimers.userActivityTimer) {
                clearTimeout(gTimers.userActivityTimer);
                gTimers.userActivityTimer = null;
            }
            gTimers.userActivityTimer = setTimeout(function() {
                gActive = false;
            }, USER_ACTIVITY_TIMEOUT);
        });
    }

    function onResize() {
        if(gVolumeBar) {
            gVolumeBar.update();
        }
        if(gProgressBar) {
            gProgressBar.update();
        }
    }

    function initEvents() {
        $(window).resize(onResize);

        $(".button").on("mousedown", function() {
            $(this).addClass("pressed");
        });

        $(".button").on("mouseup", function() {
            $(this).removeClass("pressed");
        });

        $("#btn-play").on("click", function() {
            if($(this).hasClass("disabled")) {
                return;
            }
            var action = $(this).data("action");
            debug("click:play: status=" + gDeviceStatus.status + " prebuffering=" + gPrebuffering + " action=" + action);
            if(!gPrebuffering) {
                if("restart" == action) {
                    restartPlayback();
                }
                else if("pause" == action) {
                    pause();
                }
                else if("play" == action) {
                    play();
                }
            }
        });

        $("#btn-stop").on("click", function() {
            if($(this).hasClass("disabled")) {
                return;
            }
            debug("click:stop");
            disconnect();
            stopEngineSession(true);
            setCurrentPosition(0);
            updatePlayButton();
        });

        $("#btn-select-device").on("click", function() {
            if($(this).hasClass("disabled")) {
                return;
            }
            debug("click:select-device");
            showAvailablePlayersDialog();
        });

        $("#btn-prev").on("click", function() {
            if($(this).hasClass("disabled")) {
                return;
            }
            debug("click:prev");
            switchPlaylistItem(-1);
        });

        $("#btn-next").on("click", function() {
            if($(this).hasClass("disabled")) {
                return;
            }
            debug("click:next");
            switchPlaylistItem(1);
        });


        $("#select-device-popup .dialog-close").on("click", function() {
            hideSelectDevicePopup();
            clearMessages();
        });

        $(".select-device-list").on("click", "li", function() {
            hideSelectDevicePopup();

            var playerId = $(this).data("id"),
                playerType = $(this).data("type");

            if("aircast" === playerType) {
                var device = {
                    id: playerId,
                    type: playerType,
                    protocol: $(this).data("protocol"),
                    name: $(this).data("name"),
                };

                var restartFromLastPosition = true;

                // restart if prev device was aircast
                if(gEngineSession
                    && gEngineSession.playback_url
                    && gLastSelectedDevice
                    && "aircast" === gLastSelectedDevice.type) {
                    debug("use current engine session:", gEngineSession);
                }
                else {
                    // reset engine session if prev device was local player
                    debug("reset engine session");
                    gEngineSession = null;
                }

                startPlayback(device, restartFromLastPosition);
            }
            else {
                var playlistItem = getCurrentPlaylistItem();
                if(!playlistItem) {
                    debug("missing current playlist item");
                    showToast(__('error'));
                    clearMessages();
                    return;
                }

                var params = {
                    player_id: playerId,
                    file_index: playlistItem.index,
                };
                if(gParams.a) {
                    params.a = gParams.a;
                }
                if(gParams.playlist_item_id !== undefined) {
                    params.playlist_item_id = gParams.playlist_item_id;
                }
                else if(gPlaylist.loaded) {
                    params[gPlaylist.contentDescriptor.type] = gPlaylist.contentDescriptor.value;
                }
                else {
                    debug("missing content descriptor");
                    showToast(__('error'));
                    clearMessages();
                    return;
                }

                // remember the fact the local player was selected
                gLastSelectedDevice = {
                    id: playerId,
                    type: playerType,
                };

                disconnectDevice();
                sendCommand("open_in_player", params, function(err, response) {
                    if(err) {
                        debug("failed to open in player:", err);
                        showToast(__('command-failed'));
                    }
                    else {
                        debug("open in player done:", response);
                    }
                });
            }
        });
    }

    function startDeviceStatusTimer() {
        stopDeviceStatusTimer();
        gTimers.deviceStatusTimer = setTimeout(updateDeviceStatus, DEVICE_UPDATE_INTERVAL);
    }

    function stopDeviceStatusTimer() {
        if(gTimers.deviceStatusTimer) {
            clearTimeout(gTimers.deviceStatusTimer);
            gTimers.deviceStatusTimer = null;
        }
    }

    function startEngineStatusTimer() {
        stopEngineStatusTimer();
        gTimers.engineStatusTimer = setTimeout(updateEngineStatus, ENGINE_UPDATE_INTERVAL);
    }

    function stopEngineStatusTimer() {
        if(gTimers.engineStatusTimer) {
            clearTimeout(gTimers.engineStatusTimer);
            gTimers.engineStatusTimer = null;
        }
    }

    function startEventsTimer() {
        stopEventsTimer();
        gTimers.eventsTimer = setTimeout(updateEvents, EVENTS_UPDATE_INTERVAL);
    }

    function stopEventsTimer() {
        if(gTimers.eventsTimer) {
            clearTimeout(gTimers.eventsTimer);
            gTimers.eventsTimer = null;
        }
    }

    function initPlaylist() {
        var type, value;
        if(gParams.transport_type == "direct") {
            type = "direct";
            value = gParams.transport_file_url;
        }
        else if(gParams.transport_file_url) {
            type = "url";
            value = gParams.transport_file_url;
        }
        else if(gParams.url) {
            type = "url";
            value = gParams.url;
        }
        else if(gParams.transport_file_id) {
            type = "content_id";
            value = gParams.transport_file_id;
        }
        else if(gParams.content_id) {
            type = "content_id";
            value = gParams.content_id;
        }
        else if(gParams.infohash) {
            type = "infohash";
            value = gParams.infohash;
        }
        else if(gParams.magnet) {
            type = "magnet";
            value = gParams.magnet;
        }
        else {
            throw "failed to init content descriptor";
        }

        gPlaylist.contentDescriptor = {
            type: type,
            value: value
        };

        var params = {
            mode: "full"
        };
        params[type] = value;

        if(type === "direct") {
            restartPlayback(undefined, false, {
                url: value,
                mime: null,
            });
        }
        else {
            showMessage("engineStatus", 20, __('loading-etc'));
            sendCommand("get_media_files", params, function(err, response) {
                if(err) {
                    debug("failed to load playlist", err);
                    clearMessages();
                    showToast(__('failed-to-load-transport-file'));
                }
                else {
                    debug("got playlist", response);

                    // reset items
                    gPlaylist.items = [];
                    gPlaylist.currentItemIndex = -1;
                    gPlaylist.loaded = false;

                    for(var fileIndex in response) {
                        var item = response[fileIndex];
                        gPlaylist.items.push({
                            index: fileIndex,
                            name: item.filename,
                            infohash: item.infohash,
                            type: item.type,
                            mime: item.mime,
                        });
                    }

                    gPlaylist.loaded = true;
                    if(gPlaylist.items.length > 0) {
                        setCurrentPlaylistItem(0);
                    }

                    if(gPlaylist.items.length > 0 && "yes" === gParams.autoplay) {
                        restartPlayback();
                    }
                    else {
                        clearMessages();
                    }
                }
            });
        }
    }

    function setCurrentPlaylistItem(index) {
        if(index >= 0 && index < gPlaylist.items.length) {
            gPlaylist.currentItemIndex = index;
            var item = gPlaylist.items[index];

            // item type
            // updateControls(item.type == ContentType.LIVE);

            // item title
            $("#content-title").text(item.name);

            // set playlist controls
            if(gPlaylist.items.length == 1) {
                $("#btn-prev").hide();
                $("#btn-next").hide();
            }
            else {
                $("#btn-prev").show();
                $("#btn-next").show();

                if(index > 0) {
                    $("#btn-prev").removeClass("disabled");
                }
                else {
                    $("#btn-prev").addClass("disabled");
                }

                if(index < gPlaylist.items.length-1) {
                    $("#btn-next").removeClass("disabled");
                }
                else {
                    $("#btn-next").addClass("disabled");
                }
            }
        }
    }

    function updateControls(is_live) {
        var item = getCurrentPlaylistItem();
        if(!item) {
            return;
        }

        if(is_live) {
            $("#progress-info").hide();
            $("#content-info").removeClass("video").removeClass("audio").addClass("live");
        }
        else {
            $("#progress-info").show();
            if(item.mime.substring(0, 6) == "audio/") {
                $("#content-info").removeClass("video").removeClass("live").addClass("audio");
            }
            else {
                $("#content-info").removeClass("live").removeClass("audio").addClass("video");
            }
        }
    }

    function startPlaybackStartTimer() {
        stopPlaybackStartTimer();
        gTimers.playbackStartTimer = setTimeout(function() {
            debug("playback start timer: failed to start");
            clearMessages();
            showToast(__('failed-to-start'));
            disconnect();
        }, PLAYBACK_START_TIMEOUT);
    }

    function stopPlaybackStartTimer() {
        if(gTimers.playbackStartTimer) {
            hideMessage("startPlayback");
            clearTimeout(gTimers.playbackStartTimer);
            gTimers.playbackStartTimer = null;
        }
    }

    function castToDevice(device, restartFromLastPosition, mediaInfo) {
        var url, mime;

        if(mediaInfo) {
            url = mediaInfo.url;
            mime = mediaInfo.mime;
        }
        else {
            var playlistItem = getCurrentPlaylistItem();
            if(!playlistItem) {
                debug("castToDevice: missing playlist item");
                return;
            }
            if(!gEngineSession) {
                debug("castToDevice: missing engine session");
                return;
            }
            url = gEngineSession.playback_url;
            mime = playlistItem.mime;

            if(gPlaylist && gPlaylist.contentDescriptor) {
                var params = {
                    device_id: device.id,
                    descriptor_type: gPlaylist.contentDescriptor.type,
                    descriptor_value: gPlaylist.contentDescriptor.value,
                };
                sendCommand("aircast_set_last_session", params);
            }
        }

        var seekOnStart = 0;
        if(restartFromLastPosition) {
            var settings = getContentSettingsForCurrentItem();
            if(settings && settings.position) {
                seekOnStart = settings.position;
            }
        }

        setCurrentDevice(device);
        showMessage("startPlayback", 5, __('starting-etc'));
        sendCommand("aircast_play_media", {
            device_id: device.id,
            url: url,
            mime: mime
        }, function(err, response) {
            if(err) {
                debug("playback start failed:", err);
                clearMessages();
                if("need_auth" === err) {
                    inputDialog({
                        text: __('enter-pairing-code'),
                        onok: function(value) {
                            if(value) {
                                sendCommand("aircast_set_password", {
                                    device_id: device.id,
                                    password: value
                                }, function(err, response) {
                                    if(err) {
                                        debug("failed to set password:", err);
                                        showToast(__('command-failed'));
                                    }
                                    else {
                                        castToDevice(device, restartFromLastPosition, mediaInfo);
                                    }
                                });
                            }
                        }
                    });
                }
                else {
                    showToast(__('failed-to-start'));
                }
            }
            else {
                debug("playback started: seekOnStart=" + seekOnStart);
                startPlaybackStartTimer();
                if(seekOnStart > 0) {
                    seek(seekOnStart);
                }
            }
        });
    }

    function initEngineSession(contentDescriptor, outputFormat, mime, index) {
        showMessage("engineStatus", 20, __('starting-etc'));
        sendCommand("aircast_get_local_ip_for_device", function(err, response) {
            if(err) {
                debug("failed to select host address");
                setPrebuffering(false);
                clearMessages();
            }
            else {
                var hostIp = response;
                startEngineSession({
                    contentDescriptor: contentDescriptor,
                    outputFormat: outputFormat,
                    index: index,
                }, function(err, session) {
                    if(err) {
                        debug("failed to start engine session", err);
                        setPrebuffering(false);
                        clearMessages();
                        showToast(__('failed-to-start'));
                    }
                    else {
                        debug("engine session started", session);

                        var playlistItem = getCurrentPlaylistItem();
                        if(playlistItem === null) {
                            debug("start engine session: missing current playlist item");
                            return;
                        }

                        if(session.is_live === 0) {
                            playlistItem.type = ContentType.VOD;
                            updateControls(false);
                        }
                        else {
                            playlistItem.type = ContentType.LIVE;
                            updateControls(true);
                        }

                        // engine returs 127.0.0.1 when called from localhost,
                        // but we need to use correct intranet interface when
                        // sending playback url to aircast device
                        session.playback_url = session.playback_url.replace("127.0.0.1", hostIp);
                        session.output_format = outputFormat;
                        gEngineSession = session;

                        onEngineSessionStarted();
                    }
                });
            }
        });
    }

    function play() {
        gDeviceStatus.status = DeviceStatus.PLAYING;
        renderPlaybackStatus();
        sendCommand("aircast_play");
    }

    function pause() {
        gDeviceStatus.status = DeviceStatus.PAUSED;
        renderPlaybackStatus();
        sendCommand("aircast_pause");
    }

    function stop() {
        sendCommand("aircast_stop");
    }

    function seek(value) {
        sendCommand("aircast_seek", {
            value: value
        });
    }

    function disconnect() {
        stopPlaybackStartTimer();
        gPlaybackStarted = false;
        gPlaybackRestarted = false;
        disconnectDevice();
    }

    function init(params) {
        gParams = params;

        registerPage();
        preloadImages();
        reloadLocale();
        initSeekbars();

        var device = null;
        if(params.device_id) {
            device = {
                id: params.device_id,
                type: params.device_type,
                protocol: params.device_protocol,
                name: params.device_name,
            };
        }
        setCurrentDevice(device);

        initActivityMonitor();
        initEvents();
        startDeviceStatusTimer();
        initPlaylist();

        // check initial engine session
        if(gParams.engine_session_stat_url) {
            gEngineSession = {
                playback_url: gParams.engine_session_playback_url,
                stat_url: gParams.engine_session_stat_url,
                command_url: gParams.engine_session_command_url,
                event_url: gParams.engine_session_event_url,
            };
            onEngineSessionStarted();
        }
    }

    function getCurrentPlaylistItem() {
        var item = null, idx = gPlaylist.currentItemIndex;
        if(idx >= 0 && idx < gPlaylist.items.length) {
            item = gPlaylist.items[idx];
        }
        return item;
    }

    function updateDeviceStatus() {
        sendCommand("aircast_get_status", function(err, status) {
            if(err) {
                if("not_connected" === err) {
                    gDeviceStatus.status = DeviceStatus.DISCONNECTED;
                }
                else {
                    verbose("failed to get device status", err);
                    gDeviceStatus.status = DeviceStatus.UNKNOWN;
                    if(gCurrentDevice && gCurrentDevice.protocol == DeviceProtocol.AIRPLAY && "http_error_500" == err) {
                        restartAirplay();
                    }
                }
            }
            else {
                if(status.status == DeviceStatus.BUFFERING && status.position > gDeviceStatus.position) {
                    // changed status to PLAYING when position changes
                    status.status = DeviceStatus.PLAYING;
                }

                gDeviceStatus.status = status.status;
                gDeviceStatus.volume = Math.round(status.volume * 100);
                gDeviceStatus.position = status.position;
                gDeviceStatus.duration = status.duration;
                gDeviceStatus.lastSeenAt = Date.now();

                if(gDeviceStatus.status === DeviceStatus.PLAYING) {
                    gDeviceStatus.lastPlayingAt = Date.now();
                    gPlaybackStarted = true;
                    gPlaybackRestarted = false;
                    stopPlaybackStartTimer();
                }

                updateContentSettings();
            }

            renderPlaybackStatus();
            startDeviceStatusTimer();
        })
    }

    function setDeviceStatus(newStatus) {
        if(gDeviceStatus.status != newStatus) {
            debug("device status changed: " + gDeviceStatus.status + "->" + newStatus);
        }
    }

    function setCurrentPosition(value) {
        if(!gProgressBar.isDragging) {
            gProgressBar.setValue(value);
            if(!gProgressBar.isHovering) {
                $("#text-position").text(seconds2time(value));
            }
        }
    }

    function setCurrentVolume(value) {
        if(!gVolumeBar.isDragging) {
            gVolumeBar.setValue(value);
        }
    }

    function renderPlaybackStatus() {
        var position, duration, volume;

        if(gDeviceStatus.status == DeviceStatus.DISCONNECTED) {
            position = 0;
            duration = 0;
            volume = 0;
        }
        else {
            position = gDeviceStatus.position;
            duration = gDeviceStatus.duration;
            volume = gDeviceStatus.volume;
        }
        setCurrentPosition(position);
        gProgressBar.setMax(duration || 100);
        setCurrentVolume(volume);

        $("#text-duration").text(seconds2time(duration));

        switch(gDeviceStatus.status) {
            case DeviceStatus.PLAYING:
            case DeviceStatus.BUFFERING:
                setPlayState(PlayState.PLAYING);
                enableProgressBar();
                enableVolumeBar();
                break;
            case DeviceStatus.PAUSED:
                setPlayState(PlayState.PAUSED);
                enableProgressBar();
                enableVolumeBar();
                break;
            case DeviceStatus.IDLE:
            case DeviceStatus.UNKNOWN:
            case DeviceStatus.FINISHED:
            case DeviceStatus.DISCONNECTED:
                setPlayState(PlayState.PAUSED);
                disableProgressBar();
                disableVolumeBar();
                break;
        }

        updatePlayButton();

        if(gDeviceStatus.status == DeviceStatus.BUFFERING) {
            showMessage("playerStatus", 10, "_buffering_");
        }
        else {
            hideMessage("playerStatus");
        }
    }

    function enableProgressBar() {
        $("#progress-bar").removeClass("disabled");
        gProgressBar.disabled = false;
    }

    function disableProgressBar() {
        $("#progress-bar").addClass("disabled");
        setCurrentPosition(0);
        gProgressBar.disabled = true;
    }

    function enableVolumeBar() {
        if(!gCurrentDevice || gCurrentDevice.protocol == DeviceProtocol.AIRPLAY) {
            $("#volume-bar").addClass("disabled");
            gVolumeBar.disabled = true;
        }
        else {
            $("#volume-bar").removeClass("disabled");
            gVolumeBar.disabled = false;
        }
    }

    function disableVolumeBar() {
        $("#volume-bar").addClass("disabled");
        gVolumeBar.disabled = true;
        setCurrentVolume(0);
    }

    function setPlayState(state) {
        switch(state) {
            case PlayState.PAUSED:
                $("#btn-play")
                    .removeClass("restart")
                    .addClass("paused")
                    .data("action", "play");
                break;
            case PlayState.PLAYING:
                $("#btn-play")
                    .removeClass("paused")
                    .removeClass("restart")
                    .data("action", "pause");
                break;
            case PlayState.IDLE:
                $("#btn-play")
                    .removeClass("paused")
                    .addClass("restart")
                    .data("action", "restart");
                break;
            default:
                debug("unknown play state", state);
                break;
        }
    }

    function listenEngineEvents() {
        if(!gEngineSession) {
            debug("listenEngineEvents: missing session");
            return;
        }
        if(!gEngineSession.event_url) {
            debug("listenEngineEvents: missing event url");
            return;
        }

        var params = {};
        $.ajax({
            method: "GET",
            url: gEngineSession.event_url,
            dataType: "json",
            data: params,
            timeout: 15000,
            success: function(response) {
                debug("engine event", response);
                if(response.error) {
                    debug("listenEngineEvents: error: " + response.error);
                    if(response.error == "unknown playback session id") {
                        stopEngineSession();
                    }
                }
                else if(!response.response) {
                    debug("listenEngineEvents: missing response");
                }
                else {
                    var r = response.response;
                    if(r.name === "live_changed") {
                        var is_live = r.params.is_live;
                        var item = getCurrentPlaylistItem();
                        if(item) {
                            item.type = (is_live == 1) ? ContentType.LIVE : ContentType.VOD;
                        }
                        updateControls(is_live);
                    }
                }
                listenEngineEvents();
            },
            error: function(request, error_string, exception) {
                listenEngineEvents();
            }
        });
    }

    function updateEngineStatus() {
        if(!gEngineSession) {
            debug("updateEngineStatus: missing session");
            return;
        }
        if(!gEngineSession.stat_url) {
            debug("updateEngineStatus: missing stat url");
            return;
        }

        var params = {};
        if(!shouldUpdatePlayerActivity()) {
            params['skip_player_activity'] = 1;
        }

        $.ajax({
            method: "GET",
            url: gEngineSession.stat_url,
            dataType: "json",
            data: params,
            success: function(response) {
                verbose("engine status", response);
                if(response.error) {
                    debug("updateEngineStatus: error: " + response.error);
                    if(response.error == "unknown playback session id") {
                        stopEngineSession();
                    }
                }
                else if(!response.response) {
                    debug("updateEngineStatus: missing response");
                }
                else {
                    var r = response.response;
                    gEngineStatus.status = r.status;
                    gEngineStatus.playbackSessionId = r.playback_session_id;
                    gEngineStatus.progress = r.progress;
                    gEngineStatus.peers = r.peers;
                    gEngineStatus.download = r.speed_down;
                    gEngineStatus.upload = r.speed_up;

                    renderEngineStatus();

                    if(gPrebuffering && gEngineStatus.status == 'dl') {
                        debug("finished prebuffering, start playback: gRestarting=" + gRestarting);
                        var restartFromLastPosition = gRestarting;
                        setPrebuffering(false);

                        if(gCurrentDevice) {
                            castToDevice(gCurrentDevice, restartFromLastPosition);
                        }
                    }
                }
                startEngineStatusTimer();
            },
            error: function(request, error_string, exception) {
                debug("engine status failed");
                startEngineStatusTimer();
            }
        });
    }

    function renderEngineStatus() {
        $("#engine-info").html(
            "Helping:" + gEngineStatus.peers+
            "&nbsp;&nbsp;DL:" + gEngineStatus.download+
            "&nbsp;&nbsp;UL:" + gEngineStatus.upload
            );

        if(gEngineStatus.status == "prebuf") {
            showMessage("engineStatus", 20, __('prebuffering') + " " + gEngineStatus.progress + "%");
        }
        else if(gEngineStatus.status == "checking") {
            showMessage("engineStatus", 20, __('checking') + " " + gEngineStatus.progress + "%");
        }
        else {
            hideMessage("engineStatus");
        }
    }

    function sendCommand(method, params, callback) {
        if(typeof params === 'function') {
            callback = params;
            params = {};
        }
        params = params || {};
        params["method"] = method;
        if(gParams.access_token) {
            params["token"] = gParams.access_token;
        }
        if(!params.device_id && gCurrentDevice && gCurrentDevice.id) {
            params['device_id'] = gCurrentDevice.id;
        }

        $.ajax({
            method: "GET",
            url: "/server/api",
            data: params,
            success: function(response) {
                if(typeof callback === 'function') {
                    if(response.error) {
                        callback(response.error);
                    }
                    else if(!response.hasOwnProperty("result")) {
                        callback("missing result");
                    }
                    else {
                        callback(null, response.result);
                    }
                }
            },
            error: function(request, error_string, exception) {
                showMessage("engineStatus", 20, __('server-is-not-connected'));
                if(typeof callback === 'function') {
                    callback("request failed")
                }
            }
        });
    }

    function getPlayerId() {
        return "acestreamRemoteControl";
    }

    function startEngineSession(params, callback) {
        var url;
        params = params || {};

        if(params.outputFormat.format == "hls") {
            url = "/ace/manifest.m3u8";
        }
        else {
            url = "/ace/getstream";
        }

        var query = {
            format: "json",
            use_api_events: 1,
            hlc: 0,
            sid: getPlayerId(),
            _idx: params.index,
            transcode_audio: params.outputFormat.transcodeAudio ? 1 : 0,
            transcode_mp3: params.outputFormat.transcodeMP3 ? 1 : 0,
            transcode_ac3: params.outputFormat.transcodeAC3 ? 1 : 0,
        };
        query[params.contentDescriptor.type] = params.contentDescriptor.value;
        if(gParams.a) {
            query["c"] = gParams.a;
        }

        debug("startEngineSession: params", params, "url", url, "query", query);

        $.ajax({
            method: "GET",
            url: url,
            data: query,
            success: function(response) {
                if(typeof callback === 'function') {
                    if(response.error) {
                        callback(response.error);
                    }
                    else if(!response.hasOwnProperty("response")) {
                        callback("missing response");
                    }
                    else {
                        callback(null, response.response);
                    }
                }
            },
            error: function(request, error_string, exception) {
                if(typeof callback === 'function') {
                    callback("request failed")
                }
            }
        });
    }

    function seconds2time(seconds) {
        if(!seconds) {
            return "00:00:00";
        }
        var s = "", h = 0, m = 0;
        seconds = Math.round(seconds);
        h = Math.floor(seconds / 3600);
        seconds -= h * 3600;
        m = Math.floor(seconds / 60);
        seconds -= m * 60;
        s = (("0" + h).slice(-2)) + ":" + (("0" + m).slice(-2)) + ":" + (("0" + seconds).slice(-2));
        return s;
    }

    function showMessage(type, priority, message, fontSize) {
        if(!fontSize) {
            fontSize = 28;
        }
        //debug("showMessage: type=" + type + " priority=" + priority + " fontSize=" + fontSize + " message=" + message);

        if(message == null) {
            return;
        }

        var msg = {
            type: type,
            priority: priority,
            text: message,
            fontSize: fontSize
        };
        gMessages[type] = msg;

        var $messageBox = $("#message-box");

        if(gCurrentMsg == null || gCurrentMsg.type == msg.type || msg.priority > gCurrentMsg.priority) {
            $messageBox.css({opacity: 1});
            if(message == "_buffering_") {
                showSpinner();
            }
            else {
                hideSpinner();
                $messageBox.css({
                    'font-size': fontSize+"px"
                }).text(message);
            }
            gCurrentMsg = msg;
        }
    }

    function hideMessage(type) {
        if(!gMessages[type]) {
            return;
        }
        delete gMessages[type];

        var selectedMessage = null;

        // select message with the highest priority
        for (var _type in gMessages) {
            var msg = gMessages[_type];
            if (selectedMessage == null) {
                selectedMessage = msg;
            } else if (msg.priority > selectedMessage.priority) {
                selectedMessage = msg;
            }
        }

        var $messageBox = $("#message-box");
        if(selectedMessage == null) {
            // no more messages
            gCurrentMsg = null;
            $messageBox.css({opacity: 0});
            hideSpinner();
        }
        else {
            gCurrentMsg = selectedMessage;
            $messageBox.css({opacity: 1});
            if(selectedMessage.text == "_buffering_") {
                showSpinner();
            }
            else {
                hideSpinner();
                $messageBox.css({
                    'font-size': selectedMessage.fontSize+"px"
                }).text(selectedMessage.text);
            }
        }
    }

    function clearMessages() {
        gMessages = {};
        gCurrentMsg = null;

        hideSpinner();
        $("#message-box").text("").css({opacity: 0});
    }

    function shouldUpdatePlayerActivity() {
        if(gDeviceStatus.status == DeviceStatus.PAUSED) {
            return true;
        }
        else if(gDeviceStatus.status == DeviceStatus.PLAYING) {
            return true;
        }
        else if(gPrebuffering || gActive) {
            return true;
        }
        else {
            // update activity for 3 minutes if we're playing VOD and we've got inactive air device
            var playlistItem = getCurrentPlaylistItem();
            if(playlistItem && playlistItem.type == ContentType.VOD && isDeviceConnected()) {
                var age = getDeviceSeenTimeout();
                if(age >= 15000 && age <= 180000) {
                    return true;
                }
            }

            return false;
        }
    }

    function setPrebuffering(prebufering, restarting) {
        gPrebuffering = !!prebufering;
        gRestarting = !!restarting;
        updatePlayButton();
    }

    function updatePlayButton() {
        var deviceActive,
            deviceAge = getDeviceSeenTimeout();

        if(gDeviceStatus.status == DeviceStatus.IDLE || gDeviceStatus.status == DeviceStatus.UNKNOWN || gDeviceStatus.status == DeviceStatus.FINISHED) {
            deviceActive = false;
        }
        else {
            deviceActive = isDeviceConnected();
        }

        verbose("updatePlayButton: active=" + deviceActive + " prebufering=" + gPrebuffering + " age=" + deviceAge);

        if(gPrebuffering) {
            $("#btn-play").addClass("disabled");
            setPlayState(PlayState.PAUSED);
        }
        else if(deviceActive) {
            $("#btn-play").removeClass("disabled");
        }
        else if (isDeviceConnected() && deviceAge >= 15000 && gPlaylist.loaded) {
            $("#btn-play").removeClass("disabled");
            setPlayState(PlayState.IDLE);
        }
        else if (!isDeviceConnected() && gPlaylist.loaded && !gEngineSession) {
            $("#btn-play").removeClass("disabled");
            setPlayState(PlayState.IDLE);
        }
        else {
            $("#btn-play").addClass("disabled");
            setPlayState(PlayState.PAUSED);
        }
    }

    function switchPlaylistItem(direction) {
        if(!gCurrentDevice) {
            debug("switchPlaylistItem: missing current device");
            return;
        }

        if(!gPlaylist.loaded) {
            debug("switchPlaylistItem: missing current playlist");
            return;
        }

        debug("switchPlaylistItem: index=" + gPlaylist.currentItemIndex + " direction=" + direction);

        var newIndex;
        if(direction > 0) {
            if(gPlaylist.currentItemIndex < gPlaylist.items.length - 1) {
                newIndex = gPlaylist.currentItemIndex + 1;
            }
        }
        else {
            if(gPlaylist.currentItemIndex > 0) {
                newIndex = gPlaylist.currentItemIndex-1;
            }
        }

        setCurrentPlaylistItem(newIndex);
        var item = getCurrentPlaylistItem();
        if(!item) {
            return;
        }

        // stop current playback
        stop();
        stopEngineSession(false);

        // set prebuffering state
        setPrebuffering(true);
        showMessage("engineStatus", 20, __('starting-etc'));

        // start prebuffering
        var contentDescriptor = gPlaylist.contentDescriptor;
        var mime = item.mime;
        var fileIndex = item.index;
        getOutputFormatForContent(item.type, item.mime, null, true, function(outputFormat) {
            initEngineSession(gPlaylist.contentDescriptor, outputFormat, mime, fileIndex);
        });

    }

    function restartPlayback(device, restartFromLastPosition, mediaInfo) {
        debug("restartPlayback: device="+device+" restartFromLastPosition=" + restartFromLastPosition);

        if(device === undefined) {
            if(gLastSelectedDevice && "aircast" === gLastSelectedDevice.type) {
                // check that device is still active
                sendCommand("aircast_get_device", {device_id: gLastSelectedDevice.id}, function(err, response) {
                    if(err) {
                        debug("failed to get device info:", err);
                        showAvailablePlayersDialog();
                    }
                    else {
                        debug("got device info:", response);
                        var device = response;
                        if(device.active) {
                            restartPlayback(device, restartFromLastPosition, mediaInfo);
                        }
                        else {
                            showAvailablePlayersDialog();
                        }
                    }
                });
                device = gLastSelectedDevice;
            }
            else {
                // no last aircast device, show list of available players
                showAvailablePlayersDialog();
            }
            return;
        }

        if(restartFromLastPosition === undefined) {
            if(!getContentSettingsForCurrentItem()) {
                // no saved position
                restartPlayback(device, false, mediaInfo);
            }
            else {
                // got saved position, prompt user what to do
                alertDialog({
                    text: __('ask-resume-playback'),
                    buttons: [
                        {
                            title: __('start-from-beginning'),
                            onclick: function() {
                                restartPlayback(device, false, mediaInfo);
                                return true;
                            }
                        },
                        {
                            title: __('resume'),
                            onclick: function() {
                                restartPlayback(device, true, mediaInfo);
                                return true;
                            }
                        }
                    ]
                });
            }

            return;
        }

        startPlayback(device, restartFromLastPosition, mediaInfo);
    }

    function startPlayback(device, restartFromLastPosition, mediaInfo) {
        if(mediaInfo) {
            castToDevice(device, restartFromLastPosition, mediaInfo);
        }
        else if(gEngineSession) {
            // start casting
            castToDevice(device, restartFromLastPosition);
        }
        else {
            // start prebuffering
            var playlistItem = getCurrentPlaylistItem();
            if(!playlistItem) {
                debug("startPlayback: no current playlist item");
                return;
            }
            setCurrentDevice(device);
            setPrebuffering(true, restartFromLastPosition);

            showMessage("engineStatus", 20, __('starting-etc'));

            var contentDescriptor = gPlaylist.contentDescriptor;
            var mime = playlistItem.mime;
            var fileIndex = playlistItem.index;
            getOutputFormatForContent(
                    playlistItem.type,
                    playlistItem.mime,
                    null,
                    true,
                    function(outputFormat) {
                        initEngineSession(contentDescriptor, outputFormat, mime, fileIndex);
                    });
        }
    }

    function updateServerSettings(callback) {
        sendCommand("get_server_settings", function(err, response) {
            if(response) {
                $.extend(gParams, response);
            }
            callback.call(null);
        });
    }

    function getOutputFormatForContent(type, mime, playerName, isAirCast, callback) {
        var transcodeAudio = false;
        var transcodeMP3 = false;
        var transcodeAC3 = false;
        var outputFormat;
        var prefsOutputFormat;

        if(typeof callback === "function") {
            // update settings before processing
            updateServerSettings(function() {
                var outputFormat = getOutputFormatForContent(type, mime, playerName, isAirCast);
                callback.call(null, outputFormat);
            });
            return;
        }

        if(type == ContentType.VOD) {
            prefsOutputFormat = gParams.playlist_output_format_vod;
        }
        else {
            prefsOutputFormat = gParams.playlist_output_format_live;
        }

        outputFormat = prefsOutputFormat;
        if(prefsOutputFormat == "original") {
            if(mime == HLS_MIME_TYPE) {
                outputFormat = "hls";
            }
            else {
                outputFormat = "http";
            }
        }
        else if(prefsOutputFormat == "hls") {
            transcodeAudio = gParams['transcode_audio'];
            transcodeAC3 = gParams['transcode_ac3'];
        }
        else if(prefsOutputFormat == "auto") {
            // auto selection based on content and player

            if(type == ContentType.VOD) {
                if(mime.substring(0, 6) == "audio/") {
                    // audio, http
                    outputFormat = "http";
                }
                else {
                    // video
                    if(isAirCast) {
                        // chromecast, airplay: HLS with AC3 transcoding
                        outputFormat = "hls";
                        transcodeAC3 = true;
                    }
                    else {
                        // other players - http
                        outputFormat = "http";
                    }
                }
            }
            else {
                // live, HLS - transcode all audio codecs except AAC and MP3
                outputFormat = "hls";
                transcodeMP3 = false;
                transcodeAudio = true;
            }
        }

        debug(
            "getOutputFormatForContent:"+
            " prefs= "+prefsOutputFormat+
            " format="+outputFormat+
            " ta="+transcodeAudio+
            " mp3="+transcodeMP3+
            " ac3="+transcodeAC3+
            " type="+type+
            " mime="+mime+
            " player="+playerName+
            " isAirCast="+isAirCast
            );

        var obj = {};
        obj.format = outputFormat;
        obj.transcodeAudio = transcodeAudio;
        obj.transcodeMP3 = transcodeMP3;
        obj.transcodeAC3 = transcodeAC3;

        return obj;
    }

    function isEngineSessionStarted() {
        return !!gEngineSession;
    }

    function isDeviceConnected() {
        return gCurrentDevice && gDeviceStatus.status != DeviceStatus.DISCONNECTED;
    }

    function onEngineSessionStarted() {
        debug("onEngineSessionStarted");
        $("#btn-select-device").removeClass("disabled");
        startEngineStatusTimer();
        listenEngineEvents();
    }

    function onEngineSessionStopped() {
        debug("onEngineSessionStopped");

        stopEngineStatusTimer();

        $("#btn-select-device").addClass("disabled");
        setPrebuffering(false);
        updatePlayButton();
        clearMessages();

        gEngineStatus.status = '';
        gEngineStatus.progress = 0;
        gEngineStatus.peers = 0;
        gEngineStatus.download = 0;
        gEngineStatus.upload = 0;

        renderEngineStatus();
    }

    function stopEngineSession(sendStopCommand) {
        debug("stopEngineSession: sendStopCommand=" + sendStopCommand);

        var notifyStopped = false;
        if (gEngineSession) {
            if(sendStopCommand && gEngineSession.command_url != null) {
                $.ajax({
                    method: "GET",
                    url: gEngineSession.command_url,
                    dataType: "json",
                    data: {
                        method: "stop"
                    },
                    success: function(response) {
                        debug("engine session stopped", response);
                    },
                    error: function(request, error_string, exception) {
                        debug("failed to stop engine session");
                    }
                });
            }

            gEngineSession = null;
            stopEngineStatusTimer();
            notifyStopped = true;
        }

        if(notifyStopped) {
            onEngineSessionStopped();
        }

        if(gCurrentDevice != null) {
            var age = getDeviceSeenTimeout();
            if(age >= 15000) {
                debug("stopEngineSession: disconnect air device: age=" + age);
                // stop current air device
                disconnectDevice();
            }
        }
    }

    function disconnectDevice() {
        debug("disconnectDevice");
        gWaitReconnect = false;
        if(gCurrentDevice) {
            setCurrentDevice(null);
        }
    }

    function setCurrentDevice(device) {
        debug("set current device: current=", gCurrentDevice, "new=", device);

        if(gCurrentDevice && gDeviceStatus.status != DeviceStatus.DISCONNECTED) {
            if(device && gCurrentDevice.id == device.id) {
                debug("set current device: same device: name=" + gCurrentDevice.name);
                return;
            }

            debug("disconnect prev device: name=" + gCurrentDevice.name);
            sendCommand("aircast_disconnect");
            gDeviceStatus.status = DeviceStatus.DISCONNECTED;
        }

        if(device != null) {
            gCurrentDevice = device;
            gLastSelectedDevice = device;
        }
    }

    function getDeviceSeenTimeout() {
        return Date.now() - gDeviceStatus.lastSeenAt;
    }

    function restartAirplay() {
        // try to restart AirPlay playback
        var age = Date.now() - gDeviceStatus.lastPlayingAt;
        if (!gPlaybackStarted) {
            debug("skip restart: not started");
        } else if (gPlaybackRestarted) {
            debug("skip restart: already restarted");
        } else if (!isDeviceConnected) {
            debug("skip restart: not connected");
        } else if (age > 35000) {
            debug("skip restart: outdated: age=" + age);
        } else if (!gEngineSession) {
            debug("skip restart: missing engine session");
        } else {
            gPlaybackRestarted = true;

            var startPosition = 0.0,
                playlistItem = getCurrentPlaylistItem(),
                lastPosition = gDeviceStatus.position,
                lastDuration = gDeviceStatus.duration;

            if (playlistItem && playlistItem.type == ContentType.VOD && lastDuration > 0 && lastPosition > 0) {
                startPosition = lastPosition / lastDuration;
            }

            debug("restart from position "+startPosition+
                " (age="+age+
                " type="+(playlistItem ? playlistItem.type : "?")+
                " pos="+lastPosition+
                " duration="+lastDuration+")");

            castToDevice(gCurrentDevice, false);
        }
    }

    function showSelectDevicePopup(devices) {
        var $list = $(".select-device-list");
        $list.empty();
        for(var i=0, len=devices.length; i < len; i++) {
            var d = devices[i];
            var $li = $("<li>")
            $li.html(d.name);
            $li.data("id", d.id);
            $li.data("type", d.type);
            $li.data("protocol", d.protocol);
            $li.data("name", d.name);
            $list.append($li);
        }
        $("#select-device-popup").parent().parent().fadeIn(150);
    }

    function hideSelectDevicePopup() {
        $("#select-device-popup").parent().parent().fadeOut(150);
    }

    function updateContentSettings() {
        var item = getCurrentPlaylistItem();
        if(!item) {
            verbose("updateContentSettings: missing item");
            return;
        }

        if(!item.infohash) {
            verbose("updateContentSettings: missing infohash: item:", item);
            return;
        }

        if(item.type != ContentType.VOD) {
            verbose("updateContentSettings: not a VOD: item:", item);
            return;
        }

        var key = "acestream-content-settings-infohash-" + item.infohash,
            data = {};

        if(gDeviceStatus.duration > 0) {
            data.duration = gDeviceStatus.duration;
        }
        if(gDeviceStatus.position > 0) {
            data.position = gDeviceStatus.position;
        }

        verbose("updateContentSettings: save data: item:", item, "data:", data);

        storageSet(key, JSON.stringify(data));
    }

    function getContentSettingsForCurrentItem() {
        var item = getCurrentPlaylistItem();
        if(!item) {
            debug("getContentSettingsForCurrentItem: missing current item");
            return null;
        }

        if(!item.infohash) {
            debug("getContentSettingsForCurrentItem: missing infohash: item:", item);
            return null;
        }

        var key = "acestream-content-settings-infohash-" + item.infohash,
            data = storageGet(key);

        if(!data) {
            debug("getContentSettingsForCurrentItem: missing saved data");
            return null;
        }

        try {
            data = JSON.parse(data);
            if(!data.duration) {
                throw "missing duration";
            }
            if(!data.position) {
                throw "missing position";
            }

            var pos = data.position / data.duration;
            if(pos >= 0.95) {
                debug("getContentSettingsForCurrentItem: late pos: infohash=" + item.infohash +
                    " idx=" + item.index +
                    " position=" + position +
                    " duration=" + duration +
                    " pos=" + pos);
                return null;
            }

            debug("getContentSettingsForCurrentItem: got saved data: item:", item, "data:", data);

            return {
                duration: data.duration,
                position: data.position
            };
        }
        catch(e) {
            debug("getContentSettingsForCurrentItem: failed to parse data: " + e);
            return null;
        }
    }

    function storageGet(key) {
        if(!window.localStorage) {
            return null;
        }
        return localStorage.getItem(key)
    }

    function storageSet(key, value) {
        if(window.localStorage) {
            localStorage.setItem(key, value);
        }
    }

    function preloadImages() {
        var images = [
            "/webui/images/remote-control/rc_image_live.png",
            "/webui/images/remote-control/rc_image_video.png",
            "/webui/images/remote-control/rc_image_audio.png",
            "/webui/images/remote-control/rc_volume_min.png",
            "/webui/images/remote-control/rc_volume_max.png",
            "/webui/images/remote-control/rc_stop_normal.png",
            "/webui/images/remote-control/rc_stop_pressed.png",
            "/webui/images/remote-control/rc_prev_normal.png",
            "/webui/images/remote-control/rc_prev_pressed.png",
            "/webui/images/remote-control/rc_prev_disabled.png",
            "/webui/images/remote-control/rc_next_normal.png",
            "/webui/images/remote-control/rc_next_pressed.png",
            "/webui/images/remote-control/rc_next_disabled.png",
            "/webui/images/remote-control/rc_pause_100.png",
            "/webui/images/remote-control/rc_pause_25.png",
            "/webui/images/remote-control/rc_play_100.png",
            "/webui/images/remote-control/rc_play_25.png",
            "/webui/images/remote-control/rc_restart_normal.png",
            "/webui/images/remote-control/rc_select_device_normal.png",
            "/webui/images/remote-control/rc_select_device_pressed.png",
            "/webui/images/remote-control/rc_select_device_disabled.png",
        ];
        for(var i=0, len=images.length; i<len; i++) {
            preloadImage(images[i]);
        }
    }

    function preloadImage(url) {
        var img = new Image();
        img.src = url;
    }

    function showSpinner() {
        // hide msgbox
        $("#message-box").css({opacity: 0});
        $(".spinner-container").css({opacity: 1});
    }

    function hideSpinner() {
        $(".spinner-container").css({opacity: 0});
    }

    function showAvailablePlayersDialog() {
        if(!gPlaylist.contentDescriptor) {
                debug("missing content descriptor");
            return;
        }

        var params = {};
        params[gPlaylist.contentDescriptor.type] = gPlaylist.contentDescriptor.value;
        sendCommand("get_available_players", params, function(err, response) {
            if(err) {
                debug("failed to get players", err);
                showToast(__('command-failed'));
            }
            else {
                debug("got available players", response);
                showSelectDevicePopup(response.players);
            }
        });
    }

    function shutdown() {
        // stop all timers
        for(var t in gTimers) {
            clearTimeout(gTimers[t]);
            gTimers[t] = null;
        }

        // try to close window
        window.close();

        $("#shutdown-overlay").show();
    }

    function guid() {
      function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
          .toString(16)
          .substring(1);
      }
      return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
    }

    function registerPage() {
        sendCommand("rc_register_page", {page_id: gPageId}, function(err, response) {
            if(err) {
                debug("failed to register page:", err);
            }
            else {
                debug("page registered:", response);
                startEventsTimer();
            }
        });
    }

    function updateEvents() {
        sendCommand("rc_get_events",
            {
                page_id: gPageId,
                locale: gParams.locale
            },
            function(err, response) {
                var resume = true;
                if(err) {
                    debug("events: error:", err);
                }
                else {
                    if(response && response.length) {
                        debug("got event:", response);
                        if("shutdown" === response) {
                            shutdown();
                            resume = false;
                        }
                        else if("locale_changed" === response) {
                            updateServerSettings(function() {
                                reloadLocale();
                            });
                        }
                    }
                }
                if(resume) {
                    startEventsTimer();
                }
            }
        );
    }

    function alertDialog(config) {
        var $popup = $("#alert-popup");

        function _close() {
            $popup.parent().parent().fadeOut(150);
        }

        if(!config.text) {
            config.text = "";
        }
        $popup.find(".dialog-text").html(config.text);

        $popup.find(".dialog-actions").empty();
        if(config.buttons) {
            for(var i=0, len=config.buttons.length; i<len; i++) {
                (function() {
                    // create closure to reference right |button| from click handler
                    var button = config.buttons[i],
                        $button = $("<div>").addClass("dialog-button");

                    $button.html(button.title);
                    $button.on("click", function() {
                        if(typeof button.onclick === "function") {
                            if(button.onclick.call(null)) {
                                // close popup when callback returns true
                                _close();
                            }
                        }
                    });

                    $popup.find(".dialog-actions").append($button);
                })();
            }
        }

        $popup.parent().parent().fadeIn(150);
    }

    function inputDialog(config) {
        var $popup = $("#input-popup");

        function _close() {
            $popup.parent().parent().fadeOut(150);
        }

        // set text
        if(!config.text) {
            config.text = "";
        }
        $popup.find(".dialog-text").html(config.text);

        // Cancel button
        $popup.find(".dialog-cancel").on("click", function() {
            if(typeof config.oncancel === "function") {
                config.oncancel.call(null);
            }
            _close();
        });

        // OK button
        $popup.find(".dialog-ok").on("click", function() {
            if(typeof config.onok === "function") {
                var value = $popup.find(".dialog-input").val();
                config.onok.call(null, value);
            }
            _close();
        });

        // show dialog
        $popup.parent().parent().fadeIn(150);
    }

    function __(message_id) {
        if(_LANG !== undefined) {
            if(_LANG[gParams.locale]) {
                if(_LANG[gParams.locale][message_id] !== undefined) {
                    return _LANG[gParams.locale][message_id];
                }
            }
        }
        return message_id;
    }

    function setLocale(locale)
    {
        sendCommand("set_locale", {locale: locale}, function(err, response) {
            if(!err) {
                gParams.locale = locale;
                reloadLocale();
            }
        });
    }

    function updateCurrentLocale()
    {
        debug("updateCurrentLocale: locale=" + gParams.locale);
        var localeNames = {
            'en_EN': 'EN',
            'ru_RU': 'RU',
        };
        $("#current-locale-name-short").html(localeNames[gParams.locale]);
    }

    function reloadLocale()
    {
        if(['en_EN', 'ru_RU'].indexOf(gParams.locale) === -1) {
            debug("switch locale: " + gParams.locale + " -> en_EN");
            gParams.locale = 'en_EN';
        }

        debug("reload locale:", gParams.locale);
        updateCurrentLocale();
        $(".translate").each(function() {
            var attr = $(this).data("translate-attr");
            if(attr) {
                $(this).attr(attr, __($(this).data("string-id")));
            }
            else {
                $(this).html(__($(this).data("string-id")));
            }
        });
    }

    return {
        init: init
    };


})();