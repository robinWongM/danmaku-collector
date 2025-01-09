import consola from "consola";
consola.wrapConsole();

import { collectDanmaku } from "./room";

const roomIdList = JSON.parse(process.env.ROOM_ID_LIST || "[]") as number[];

for (const roomId of roomIdList) {
  collectDanmaku(roomId);
  await Bun.sleep(1000 + Math.random() * 500);
}