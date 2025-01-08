export const get = <T>(path: string) => {
  const url = new URL(path, "https://api.live.bilibili.com");
  return fetch(url.toString(), {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0',
      Accept: '*/*',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      Origin: 'https://live.bilibili.com',
      Cookie: process.env.BILI_COOKIE!,
    },
  }).then((res) => res.json() as Promise<T>);
};

export const getDanmakuServer = async (roomId: number) => {
  const resp = await get<LiveChatResponse>(
    `/xlive/web-room/v1/index/getDanmuInfo?id=${roomId}&type=0`
  );

  if (resp.code !== 0) {
    throw new Error(resp.message);
  }

  return {
    host: resp.data.host_list[0].host,
    port: resp.data.host_list[0].wss_port,
    token: resp.data.token,
  }
};

/** Host configuration for bilibili live chat servers */
interface HostConfig {
  /** Server hostname */
  host: string;
  /** TCP port */
  port: number;
  /** WebSocket Secure port */
  wss_port: number;
  /** WebSocket port */
  ws_port: number;
}

/** Data payload containing live chat configuration */
interface LiveChatData {
  /** Server group identifier */
  group: string;
  /** Business identifier */
  business_id: number;
  /** Refresh row factor for chat updates */
  refresh_row_factor: number;
  /** Refresh rate in milliseconds */
  refresh_rate: number;
  /** Maximum allowed delay in milliseconds */
  max_delay: number;
  /** Authentication token */
  token: string;
  /** List of available chat servers */
  host_list: HostConfig[];
}

/** API response structure for live chat configuration */
interface LiveChatResponse {
  /** Response code, 0 indicates success */
  code: number;
  /** Response message */
  message: string;
  /** Time to live */
  ttl: number;
  /** Response payload */
  data: LiveChatData;
}
