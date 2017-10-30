-- TorrentStream SQLite Database
-- Version: 1

BEGIN TRANSACTION create_table;

----------------------------------------

CREATE TABLE Category (
  category_id    integer PRIMARY KEY NOT NULL,
  name           text NOT NULL,
  description    text
);

----------------------------------------

CREATE TABLE MyInfo (
  entry  PRIMARY KEY,
  value  text
);

----------------------------------------

CREATE TABLE Torrent (
  torrent_id       integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  is_multi         integer NOT NULL DEFAULT 0,
  infohash		   text,
  `checksum`	   text NOT NULL,
  name             text,
  torrent_file_name text,
  length           integer,
  creation_date    integer,
  num_files        integer,
  thumbnail        integer,
  insert_time      numeric,
  secret           integer,
  relevance        numeric DEFAULT 0,
  source_id        integer,
  category_id      integer,
  status_id        integer,
  num_seeders      integer,
  num_leechers     integer,
  comment          text
);

CREATE INDEX infohash_idx
  ON Torrent
  (infohash);
  
CREATE UNIQUE INDEX torrent_checksum_idx
  ON Torrent
  (`checksum`);

CREATE INDEX Torrent_length_idx
  ON Torrent
  (length);

CREATE INDEX Torrent_creation_date_idx
  ON Torrent
  (creation_date);

CREATE INDEX Torrent_relevance_idx
  ON Torrent
  (relevance);

CREATE INDEX Torrent_num_seeders_idx
  ON Torrent
  (num_seeders);

CREATE INDEX Torrent_num_leechers_idx
  ON Torrent
  (num_leechers);

CREATE INDEX Torrent_name_idx 
  ON Torrent
  (name);

----------------------------------------

CREATE TABLE TorrentSource (
  source_id    integer PRIMARY KEY NOT NULL,
  name         text NOT NULL,
  description  text
);

CREATE UNIQUE INDEX torrent_source_idx
  ON TorrentSource
  (name);

----------------------------------------

CREATE TABLE TorrentStatus (
  status_id    integer PRIMARY KEY NOT NULL,
  name         text NOT NULL,
  description  text
);

----------------------------------------

CREATE TABLE TorrentTracker (
  torrent_id   integer NOT NULL,
  tracker      text NOT NULL,
  announce_tier    integer,
  ignored_times    integer,
  retried_times    integer,
  last_check       numeric
);

CREATE UNIQUE INDEX torrent_tracker_idx
  ON TorrentTracker
  (torrent_id, tracker);
  
----------------------------------------
--anton_
CREATE TABLE url2torrent (
    urlhash TEXT PRIMARY KEY NOT NULL,
    url TEXT NOT NULL,
    infohash TEXT NOT NULL,
    updated NUMERIC
);

CREATE TABLE adid2infohash (
    adid TEXT PRIMARY KEY NOT NULL,
    infohash TEXT NOT NULL,
    last_seen INTEGER NOT NULL
);
CREATE INDEX adid2infohash_infohash_idx ON adid2infohash (infohash);

CREATE TABLE ts_players (
    player_id TEXT PRIMARY KEY NOT NULL,
    is_multi INTEGER NOT NULL DEFAULT 0,
    `checksum` TEXT NOT NULL,
    infohash TEXT NULL,
    developer_id INTEGER,
    affiliate_id INTEGER,
    zone_id INTEGER
);
CREATE INDEX ts_players_checksum_idx ON ts_players (`checksum`);
CREATE INDEX ts_players_infohash_idx ON ts_players (infohash);

CREATE TABLE ts_metadata (
    infohash TEXT PRIMARY KEY NOT NULL,
    idx INTEGER NOT NULL,
    duration INTEGER,
    prebuf_pieces TEXT,
    replace_mp4_metatags TEXT
);

CREATE UNIQUE INDEX ts_metadata_idx ON ts_metadata (infohash, idx);
CREATE INDEX ts_metadata_infohash_idx ON ts_metadata (infohash);

CREATE TABLE user_profiles (
    `id`        INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    `created`   INTEGER NOT NULL,
    `modified`  INTEGER NOT NULL,
    `active`    INTEGER NOT NULL
);

CREATE TABLE user_profile_data (
    `profile_id`    INTEGER NOT NULL,
    `name`          TEXT NOT NULL,
    `value`         TEXT
);

CREATE UNIQUE INDEX user_profile_data_idx_profile_param ON user_profile_data (`profile_id`, `name`);
CREATE INDEX user_profile_data_idx_profile ON user_profile_data (`profile_id`);

CREATE TABLE `gender` (
    `id`   INTEGER PRIMARY KEY NOT NULL,
    `name` TEXT NOT NULL
);

CREATE TABLE `age` (
    `id`   INTEGER PRIMARY KEY NOT NULL,
    `name` TEXT NOT NULL
);
--_anton
----------------------------------------

CREATE VIEW CollectedTorrent AS SELECT * FROM Torrent WHERE torrent_file_name IS NOT NULL;

-------------------------------------

COMMIT TRANSACTION create_table;

----------------------------------------

BEGIN TRANSACTION init_values;

INSERT INTO Category VALUES (1, 'Video', 'Video Files');
INSERT INTO Category VALUES (2, 'VideoClips', 'Video Clips');
INSERT INTO Category VALUES (3, 'Audio', 'Audio');
INSERT INTO Category VALUES (4, 'Compressed', 'Compressed');
INSERT INTO Category VALUES (5, 'Document', 'Documents');
INSERT INTO Category VALUES (6, 'Picture', 'Pictures');
INSERT INTO Category VALUES (7, 'xxx', 'XXX');
INSERT INTO Category VALUES (8, 'other', 'Other');

INSERT INTO TorrentStatus VALUES (0, 'unknown', NULL);
INSERT INTO TorrentStatus VALUES (1, 'good', NULL);
INSERT INTO TorrentStatus VALUES (2, 'dead', NULL);

INSERT INTO TorrentSource VALUES (0, '', 'Unknown');
INSERT INTO TorrentSource VALUES (1, 'TS', 'Received from other user');

INSERT INTO MyInfo VALUES ('version', 6);

INSERT INTO `gender` VALUES (1, 'gender_male');
INSERT INTO `gender` VALUES (2, 'gender_female');

INSERT INTO `age` VALUES (1,  'age_less_than_13');
INSERT INTO `age` VALUES (2,  'age_13_17');
INSERT INTO `age` VALUES (3,  'age_18_21');
INSERT INTO `age` VALUES (9,  'age_22_25');
INSERT INTO `age` VALUES (4,  'age_26_30');
INSERT INTO `age` VALUES (10, 'age_31_36');
INSERT INTO `age` VALUES (5,  'age_37_44');
INSERT INTO `age` VALUES (6,  'age_45_54');
INSERT INTO `age` VALUES (7,  'age_55_64');
INSERT INTO `age` VALUES (8,  'age_more_than_64');

COMMIT TRANSACTION init_values;
