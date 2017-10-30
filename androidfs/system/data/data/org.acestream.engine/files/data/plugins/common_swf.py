#-plugin-sig:AwQ94xBKLvmJP3H2uUlaIlcJw5mZV+gqG7iSS76hxtdu98zHuX49wKWo1YbInQDDSdTVJwaAn8xYi1xXTyxoPc1/yIJc7MK6kF2layJ8WTnTxlb3WBr0aV+S5K97Cmks0TwT3buYBm6wvtWRctmLU2uv6f6qatI8yM6VtQF7Ip96dF5Pth4Rm0xG06XR0JNyhGY9ZIZ3r91JXziyQjdVSXKH5mdsgDoqO0Uw/eZvVvgFZnR3lKZpe8s6aP9ZsFoyvVNLSVvANKD7G3AkhEObYzTxCt658g9Jv9WcdolJrk/2qNwQucujh3GV2KQmGPsPujVsILR+OI02Wk8TbnbpOw==
from collections import namedtuple
from io import BytesIO

from ACEStream.PluginsContainer.livestreamer.utils import swfdecompress
from ACEStream.PluginsContainer.livestreamer.packages.flashmedia.types import U16LE, U32LE

__all__ = ["parse_swf"]

Rect = namedtuple("Rect", "data")
Tag = namedtuple("Tag", "type data")
SWF = namedtuple("SWF", "frame_size frame_rate frame_count tags")


def read_rect(fd):
    header = ord(fd.read(1))
    nbits = header >> 3
    nbytes = int(((5 + 4 * nbits) + 7) / 8)
    data = fd.read(nbytes - 1)

    return Rect(data)


def read_tag(fd):
    header = U16LE.read(fd)
    tag_type = header >> 6
    tag_length = header & 0x3f
    if tag_length == 0x3f:
        tag_length = U32LE.read(fd)

    tag_data = fd.read(tag_length)

    return Tag(tag_type, tag_data)


def read_tags(fd):
    while True:
        try:
            yield read_tag(fd)
        except IOError:
            break


def parse_swf(data):
    data = swfdecompress(data)
    fd = BytesIO(data[8:])
    frame_size = read_rect(fd)
    frame_rate = U16LE.read(fd)
    frame_count = U16LE.read(fd)
    tags = list(read_tags(fd))

    return SWF(frame_size, frame_rate, frame_count, tags)

