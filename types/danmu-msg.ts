interface UserBaseInfo {
  face: string;
  is_mystery: boolean;
  name: string;
  name_color: number;
  name_color_str: string;
  official_info: {
    desc: string;
    role: number;
    title: string;
    type: number;
  };
  origin_info: {
    face: string;
    name: string;
  };
  risk_ctrl_info: null;
}

interface UserMedal {
  color: number;
  color_border: number;
  color_end: number;
  color_start: number;
  guard_icon: string;
  guard_level: number;
  honor_icon: string;
  id: number;
  is_light: number;
  level: number;
  name: string;
  ruid: number;
  score: number;
  typ: number;
  user_receive_count: number;
  v2_medal_color_border: string;
  v2_medal_color_end: string;
  v2_medal_color_level: string;
  v2_medal_color_start: string;
  v2_medal_color_text: string;
}

interface UserInfo {
  base: UserBaseInfo;
  guard: null;
  guard_leader: {
    is_guard_leader: boolean;
  };
  medal: UserMedal;
  title: {
    old_title_css_id: string;
    title_css_id: string;
  };
  uhead_frame: null;
  uid: number;
  wealth: null;
}

interface DanmakuExtra {
  send_from_me: boolean;
  master_player_hidden: boolean;
  mode: number;
  color: number;
  dm_type: number;
  font_size: number;
  player_mode: number;
  show_player_type: number;
  content: string;
  user_hash: string;
  emoticon_unique: string;
  bulge_display: number;
  recommend_score: number;
  main_state_dm_color: string;
  objective_state_dm_color: string;
  direction: number;
  pk_direction: number;
  quartet_direction: number;
  anniversary_crowd: number;
  yeah_space_type: string;
  yeah_space_url: string;
  jump_to_url: string;
  space_type: string;
  space_url: string;
  animation: Record<string, unknown>;
  emots: null;
  is_audited: boolean;
  id_str: string;
  icon: null;
  show_reply: boolean;
  reply_mid: number;
  reply_uname: string;
  reply_uname_color: string;
  reply_is_mystery: boolean;
  reply_type_enum: number;
  hit_combo: number;
  esports_jump_url: string;
}

export interface EmojiObject {
  bulge_display: number;
  emoticon_unique: string;
  height: number;
  in_player_area: number;
  is_dynamic: number;
  url: string;
  width: number;
}

export interface DanmakuMessage {
  cmd: "DANMU_MSG";
  dm_v2: string;
  info: [
    [
      number,
      number,
      fontSize: number,
      color: number,
      number,
      number,
      number,
      string,
      number,
      number,
      number,
      string,
      number,
      '{}' | EmojiObject,
      '{}',
      {
        extra: string;
        mode: number;
        show_player_type: number;
        user: UserInfo;
      },
      {
        activity_identity: string;
        activity_source: number;
        not_show: number;
      },
      number
    ],
    content: string,
    [
      senderUid: number,
      senderName: string,
      number,
      number,
      number,
      number,
      number,
      string
    ],
    [
      number,
      medalName: string,
      medalUpName: string,
      medalRoomId: number,
      number,
      string,
      number,
      number,
      number,
      number,
      number,
      number,
      fanBadgeUpUid: number
    ],
    [number, number, number, string, number],
    [string, string],
    number,
    number,
    null,
    {
      ct: string;
      ts: number;
    },
    number,
    number,
    null,
    null,
    number,
    number,
    number[],
    null
  ];
}
