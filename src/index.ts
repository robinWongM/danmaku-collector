import consola from "consola";
consola.wrapConsole();

import { collectDanmaku } from "./room";

const roomIdList = JSON.parse(process.env.ROOM_ID_LIST || "[]") as number[];
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

for (const roomId of roomIdList) {
  collectDanmaku(roomId);
  await delay(1000 + Math.random() * 500);
}