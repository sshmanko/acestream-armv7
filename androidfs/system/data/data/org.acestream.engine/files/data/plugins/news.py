# -*- coding: utf-8 -*-
#-plugin-sig:KTN+vyc07bjreIfS5Vmu4xoe9rZvvROvOTXWhz9IIdvJyM6eRqjI7wCzFrSCa1RdD3Pl+pxKUo7gh3IPz3CEI5f+kr2GORQJcIfFaVZRlAlpOykWD9HZ4hJAdT5UAz5EsdMPkPP1DtAEMmoFOeypKBlwXSw1DOPrB4BHRYafrJ+wJqzaQA1OzcVbyUxqPGfAWVvX1NqGNdl3m+w2rGWz4Zreg+N0EKUg6byLhQyvvyGYsCFzlxU2v/kg4GAoZTjP80hDmK0VzxrI/6xdpY5S5lqzfmz4kHAjyQTl+zPlkiFhQNGEl4K6dre49Xi4fid8BpCFjSn+wjjKJi3FYILZLQ==
__version__ = 1.2

from ACEStream.PluginsContainer.livestreamer.compat import urlparse
from ACEStream.PluginsContainer.livestreamer.plugin import Plugin, PLUGIN_TYPE_NEWS_PROVIDER
from ACEStream.PluginsContainer.livestreamer.plugin.api import http
from ACEStream.PluginsContainer.livestreamer.stream import HLSStream, HTTPStream
from bs4 import NavigableString, BeautifulSoup, Comment
from lxml.html.clean import clean_html, Cleaner
import cookielib, urllib2
from urlparse import urlparse
import time
import random
import os
import json
import sys
#from profiler import Profiler

SCHEME_CACHE_TIMEOUT = 4 * 3600
SCHEMAS_URI = "http://acestream.news/schemas/"
BROWSERS = [
        "Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36",
        ]
# browser emulated headers
HEADERS = {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Encoding' : 'br',
        'Accept-Language': 'en-US,en;q=0.8',
        'DNT': 1,
        'Pragma' : 'no-cache',
        'Referer': '',
        'User-Agent': random.choice(BROWSERS),
        }

__attrs2save__ = ['href', 'alt', 'title', "src"]
#_p = Profiler()

class News(Plugin):
    scheme = None
    domain = None
    plugin_type = PLUGIN_TYPE_NEWS_PROVIDER

    # can_handle_url: check plugin could parse url {{{
    #
    @classmethod
    def can_handle_url(self, url):
        self.url = url
        self.scheme = None

        try:
            parsed = urlparse(url)
            self.domain = parsed.netloc
            self.scheme = self.get_scheme(self.domain)
        except Exception as e:
            self.logger.error("Failed to get scheme for '{0}'. {1}", url, str(e))

        return self.scheme != None
    # }}}

    # _get_article: request for parse article {{{
    def _get_article(self):
        html = self.fetch_by_uri(self.url)

        return self._parse_page(html, self.scheme)
    # }}}

    # fetch_by_uri: fetch html by uri {{{
    #
    @classmethod
    def fetch_by_uri(self, uri):
        headers = HEADERS
        headers['Referer'] = uri
        headers['Host'] = self.domain
        html = None

        try:
            cj = cookielib.CookieJar()
            opener = urllib2.build_opener(urllib2.HTTPCookieProcessor(cj))
            opener.addheaders=[(k, v) for k, v in headers.iteritems()]
            page = opener.open(uri)
            html = page.read()

            self.logger.debug("Fetched data from '{0}', size {1}B", uri, len(html))
        except Exception as e:
            self.logger.error("Fetch data failed from '{0}': {1}", uri, str(e))

        return html
    # }}}

    # get_scheme: load scheme by domain name and .scheme extension {{{
    #
    @classmethod
    def get_scheme(self, domain):
        if not domain:
            return None

        if domain[:4] == "www.":
            domain = domain[4:]

        scheme = None
        schemefile = domain + '.scheme'
        path = fpath = os.path.join(self.session.get_cache_dir(), schemefile)

        try:
            #check file or file age
            if time.time() - os.path.getmtime(path) > SCHEME_CACHE_TIMEOUT:
                self.logger.debug("Scheme found, but too old: '{0}'", path)
                raise Exception("Scheme file is too old")

            f = open(path, 'r');
            scheme = json.load(f)
            f.close()

            self.logger.debug("Scheme found: '{0}'", path)
        except:
            self.logger.debug("Scheme not found in local storage: '{0}', trying remote...", path)

            try:
                path = SCHEMAS_URI + schemefile
                data = self.fetch_by_uri(path)
                scheme = json.loads(data)
                self.logger.debug("Scheme found: '{0}'", path)

                # save scheme to cache
                try:
                    f = open(fpath, "w")
                    f.write(data)
                    f.close()
                except Exception as e:
                    self.logger.error("Failed to save scheme to cache: {0}", e)

            except Exception as e:
                self.logger.error("Scheme not found: '{0}'", schemefile)

        return scheme
    # }}}

    # _clean_attrs: remove odd attributes from tag {{{
    def _clean_attrs(self, bs):
        if not bs:
            return

        # remove attrs
        attrs = bs.attrs.keys()

        for attr in attrs:
            if attr not in __attrs2save__:
                del bs.attrs[attr]
    # }}}

    # _cleanup_html: remove odd tags from html {{{
    def _cleanup_html(self, bs, save):
        if not bs:
            return u""

        # remove comments
        comments = bs.findAll(text=lambda text:isinstance(text, Comment))
        [comment.extract() for comment in comments]

        for tag in bs.findAll(True):
            if tag.name == 'script':
                tag.extract()
            elif tag.name not in save:
                tag.replaceWithChildren()
            else:
                self._clean_attrs(tag)

        self._clean_attrs(bs)

        return bs.prettify()
    # }}}

    # _get_data: extract data as array of properties from html {{{
    def _get_data(self, bs, opts):
        data = []

        if not bs:
            return data

        if 'block' in opts:
            attrs = opts['block']['attrs'] if 'attrs' in opts['block'] else None
            bs = bs.find(opts['block']['tag'], attrs)

        if not bs:
            return data

        attrs = opts['attrs'] if 'attrs' in opts else None

        for tag in bs.findAll(opts['tag'], attrs):
            link = tag.get(opts['data'])

            if link:
                data.append(unicode(link))

        return data
    # }}}

    # _parse_page: page parser entry {{{
    #
    def _parse_page(self, html, scheme):
        #_p.start("parse page")
        page = {}

        if not html or len(html) < 3:
            return page

        bs = BeautifulSoup(html, "html5lib")

        for ctype in scheme.keys():
            #_p.trace("parse:" + ctype)
            opts = scheme[ctype]
            attrs = opts['attrs'] if 'attrs' in opts else {}

            if 'html' in opts and opts['html'] == True:
                part = bs.find(opts['tag'], attrs)

                if part:
                    part = BeautifulSoup(part.prettify("utf-8"), "html5lib")
                    page[ctype] = unicode(self._cleanup_html(part, opts['save'] if 'save' in opts else [])).strip()
                else:
                    page[ctype] = None
            elif 'data' in opts:
                page[ctype] = self._get_data(bs, opts)
            else:
                part = bs.find(opts['tag'], attrs)
                text = ""

                if part:
                    if 'text' in opts and opts['text'] == "string":
                        # remove all subtags
                        for child in part.findAll(True):
                            child.extract()
                    text = part.text if part and part.text else ''

                page[ctype] = unicode(text).strip()
        #_p.end("parse page")

        return page
    # }}}

__plugin__ = News
