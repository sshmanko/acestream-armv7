var _LANG = {};

function __(message_id) {
    if(_LANG !== undefined) {
        if(_LANG[params.locale]) {
            if(_LANG[params.locale][message_id] !== undefined) {
                return _LANG[params.locale][message_id];
            }
        }
    }
    return message_id;
}