import type { DanmakuMessage } from "./types/danmu-msg";

export interface BiliHeader {
  packetLength: number;
  headerLength: number;
  protocolVersion: number;
  operation: number;
  sequenceId: number;
}

export interface BiliPacket {
  header: BiliHeader;
  body: string;
}

export interface BiliMessage<Command extends string, Data> {
  cmd: Command;
  data: Data;
}

export type WatchedChange = BiliMessage<"WATCHED_CHANGE", { num: number; text_small: string; text_large: string }>;

export type InteractWord = BiliMessage<"INTERACT_WORD", {
  contribution: { grade: number };
  contribution_v2: { grade: number; rank_type: string; text: string };
  core_user_type: number;
  dmscore: number;
  fans_medal: {
    anchor_roomid: number;
    guard_level: number;
    icon_id: number;
    is_lighted: number;
    medal_color: number;
    medal_color_border: number;
    medal_color_end: number;
    medal_color_start: number;
    medal_level: number;
    medal_name: string;
    score: number;
    special: string;
    target_id: number;
  };
  group_medal: null;
  identities: [1];
  is_mystery: false;
  is_spread: 0;
  msg_type: 1;
  privilege_type: 0;
  relation_tail: { tail_guide_text: string; tail_icon: string; tail_type: 0 };
  roomid: number;
  score: number;
  spread_desc: string;
  spread_info: string;
  tail_icon: 0;
  tail_text: string;
  timestamp: number;
  trigger_time: number;
  uid: number;
  uinfo: {
    base: {
      face: string;
      is_mystery: false;
      name: string;
      name_color: number;
      name_color_str: string;
      official_info: null;
      origin_info: null;
      risk_ctrl_info: null;
    };
    guard: { expired_str: string; level: 0 };
    guard_leader: null;
    medal: {
      color: number;
      color_border: number;
      color_end: number;
      color_start: number;
      guard_icon: string;
      guard_level: number;
      honor_icon: string;
      id: number;
      is_light: 0;
      level: 4;
      name: string;
      ruid: number;
      score: number;
      typ: 0;
      user_receive_count: 0;
      v2_medal_color_border: string;
      v2_medal_color_end: string;
      v2_medal_color_level: string;
      v2_medal_color_start: string;
      v2_medal_color_text: string;
    };
    title: null;
    uhead_frame: null;
    uid: number;
    wealth: { dm_icon_key: string; level: number };
  };
  uname: string;
  uname_color: string;
}>;

export type KnownBiliMessage = WatchedChange | InteractWord | DanmakuMessage;