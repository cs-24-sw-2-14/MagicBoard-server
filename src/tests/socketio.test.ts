import { beforeAll, afterAll, describe, it, expect, test } from "vitest";
import { server, socketio } from "../server"; // Ensure correct path
import { io as ioc, type Socket as ClientSocket } from "socket.io-client";
import { type Socket as ServerSocket } from "socket.io";
import fetch from "node-fetch";
import { BoardId, CommandId } from "../types";
import { EditEvent } from "../socketioInterfaces";

const SERVER_PORT = 5123;
const USERNAME = "tbdlarsen";
const COLOR = 2;

describe("BoardSocket Testing", () => {
  let serverSocket: ServerSocket;
  let clientSocket: ClientSocket;

  /*
   * Creating the server for testing
   * */
  beforeAll(async () => {
    if (!server.listening) {
      await new Promise<void>((resolve) => {
        server.listen(SERVER_PORT, resolve);
      });
    }

    const response = await fetch(
      `http://localhost:${SERVER_PORT}/v1/board/create`,
      {
        method: "POST",
      },
    );
    if (!response.ok) {
      console.error(`Failed to fetch /v1/board/create: ${response.statusText}`);
      throw new Error(
        `Failed to fetch /v1/board/create: ${response.statusText}`,
      );
    }

    let data;
    try {
      data = (await response.json()) as { board_id: BoardId };
    } catch (err) {
      console.error(`Failed to parse JSON response: ${err}`);
      throw new Error(`Failed to parse JSON response: ${err}`);
    }

    const boardId = data.board_id;

    clientSocket = ioc(`ws://localhost:${SERVER_PORT}/${boardId}`, {
      auth: {
        username: USERNAME,
        color: COLOR.toString(),
      },
    });

    socketio.on("connection", (socket) => {
      serverSocket = socket;
    });

    await new Promise<void>((resolve) => {
      clientSocket.on("connect", resolve);
    });
  });

  /*
   * closes the server after testing
   * */
  afterAll(() => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
    if (server.listening) {
      server.close();
    }
  });

  /*
   * The tests
   * */

  it("startDraw", () => {
    return new Promise<void>((resolve) => {
      clientSocket.emit(
        "startDraw",
        {
          position: { x: 0, y: 0 },
          stroke: "000000",
          fill: "transparent",
          strokeWidth: 7,
          username: USERNAME,
        },
        (commandId: CommandId) => {
          expect(commandId).toEqual(0);
        },
      );

      clientSocket.on("edit", (data: EditEvent) => {
        expect(data.commandId).toEqual(0);
        expect(data.position).toEqual({ x: 0, y: 0 });
        expect(data.svgString).toEqual(
          "<path stroke='000000' fill='transparent' stroke-width='7' d='M0,0' />",
        );
        clientSocket.off("edit");
        resolve();
      });
    });
  });

  it("doDraw 0", () => {
    return new Promise<void>((resolve) => {
      clientSocket.emit("doDraw", {
        position: { x: 10, y: 10 },
        commandId: 0,
      });

      clientSocket.on("edit", (data: EditEvent) => {
        expect(data.commandId).toEqual(0);
        expect(data.position).toEqual({ x: 0, y: 0 });
        expect(data.svgString).toEqual(
          "<path stroke='000000' fill='transparent' stroke-width='7' d='M0,0L10,10' />",
        );
        clientSocket.off("edit");
        resolve();
      });
    });
  });

  it("doDraw 1", () => {
    return new Promise<void>((resolve) => {
      clientSocket.emit("doDraw", {
        position: { x: 20, y: 20 },
        commandId: 0,
      });

      clientSocket.on("edit", (data: EditEvent) => {
        expect(data.commandId).toEqual(0);
        expect(data.position).toEqual({ x: 0, y: 0 });
        expect(data.svgString).toEqual(
          "<path stroke='000000' fill='transparent' stroke-width='7' d='M0,0L10,10L20,20' />",
        );
        clientSocket.off("edit");
        resolve();
      });
    });
  });

  it("startErase", () => {
    return new Promise<void>((resolve) => {
      clientSocket.emit(
        "startErase",
        {
          position: { x: 8, y: 8 },
          commandIdsUnderCursor: [0],
          threshold: 1,
          username: USERNAME,
        },
        (commandId: CommandId) => {
          expect(commandId).toEqual(1);
        },
      );

      clientSocket.on("edit", (data: EditEvent) => {
        expect(data.commandId).toEqual(0);
        expect(data.position).toEqual({ x: 0, y: 0 });
        expect(data.svgString).toEqual(
          "<path stroke='000000' fill='transparent' stroke-width='7' d='M0,0L10,10L20,20' />",
        );
        clientSocket.off("edit");
        resolve();
      });
    });
  });

  it("doErase", () => {
    return new Promise<void>((resolve) => {
      clientSocket.emit("doErase", {
        position: { x: 10, y: 10 },
        commandIdsUnderCursor: [0],
        commandId: 1,
      });

      clientSocket.on("edit", (data: EditEvent) => {
        expect(data.commandId).toEqual(0);
        expect(data.position).toEqual({ x: 0, y: 0 });
        expect(data.svgString).toEqual(
          "<path stroke='000000' fill='transparent' stroke-width='7' d='M0,0M20,20' />",
        );
        clientSocket.off("edit");
        resolve();
      });
    });
  });

  it("startMove", () => {
    return new Promise<void>((resolve) => {
      clientSocket.emit(
        "startMove",
        {
          movedCommandId: 0,
          username: USERNAME,
        },
        (commandId: CommandId) => {
          expect(commandId).toEqual(2);
        },
      );

      clientSocket.on("edit", (data: EditEvent) => {
        expect(data.commandId).toEqual(0);
        expect(data.position).toEqual({ x: 0, y: 0 });
        expect(data.svgString).toEqual(
          "<path stroke='000000' fill='transparent' stroke-width='7' d='M0,0M20,20' />",
        );
        clientSocket.off("edit");
        resolve();
      });
    });
  });

  it("doMove", () => {
    return new Promise<void>((resolve) => {
      clientSocket.emit("doMove", {
        position: { x: 12, y: 12 },
        commandId: 2,
      });

      clientSocket.on("edit", (data: EditEvent) => {
        expect(data.commandId).toEqual(0);
        expect(data.position).toEqual({ x: 12, y: 12 });
        expect(data.svgString).toEqual(
          "<path stroke='000000' fill='transparent' stroke-width='7' d='M0,0M20,20' />",
        );
        clientSocket.off("edit");
        resolve();
      });
    });
  });

  const testCasesUndo: EditEvent[] = [
    {
      commandId: 0,
      position: { x: 0, y: 0 },
      svgString:
        "<path stroke='000000' fill='transparent' stroke-width='7' d='M0,0M20,20' />",
    },
    {
      commandId: 0,
      position: { x: 0, y: 0 },
      svgString:
        "<path stroke='000000' fill='transparent' stroke-width='7' d='M0,0L10,10L20,20' />",
    },
    // {
    //   commandId: 0,
    //   position: { x: 0, y: 0 },
    //   svgString:
    //     "<path stroke='000000' fill='transparent' stroke-width='7' d='M0,0L10,10L20,20' />",
    // },
  ];

  test.each(testCasesUndo)("undo - case %#", async (expected: EditEvent) => {
    return new Promise<void>((resolve) => {
      clientSocket.emit("undo", {
        username: USERNAME,
      });

      clientSocket.on("edit", (data: EditEvent) => {
        expect(data.commandId).toEqual(expected.commandId);
        expect(data.position).toEqual(expected.position);
        expect(data.svgString).toEqual(expected.svgString);
        clientSocket.off("edit");
        resolve();
      });
    });
  });

  const testCasesRedo: EditEvent[] = [
    {
      commandId: 0,
      position: { x: 0, y: 0 },
      svgString:
        "<path stroke='000000' fill='transparent' stroke-width='7' d='M0,0M20,20' />",
    },
    {
      commandId: 0,
      position: { x: 12, y: 12 },
      svgString:
        "<path stroke='000000' fill='transparent' stroke-width='7' d='M0,0M20,20' />",
    },
  ];

  test.each(testCasesRedo)("redo - case %#", async (expected: EditEvent) => {
    return new Promise<void>((resolve) => {
      clientSocket.emit("redo", {
        username: USERNAME,
      });

      clientSocket.on("edit", (data: EditEvent) => {
        expect(data.commandId).toEqual(expected.commandId);
        expect(data.position).toEqual(expected.position);
        expect(data.svgString).toEqual(expected.svgString);
        clientSocket.off("edit");
        resolve();
      });
    });
  });
});
