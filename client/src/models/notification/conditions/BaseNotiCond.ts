import * as uuid from "uuid";
import { getUnixTime } from "date-fns";
import { INotiCond, NotiCondJSON, NotiType } from "../notification.types";

export abstract class BaseNotiCond implements INotiCond {
  id: string;
  notifiedAt: Date | null = null;
  abstract name?: string;
  abstract type?: NotiType;

  constructor() {
    this.id = uuid.v4();
  }

  toJSON(): NotiCondJSON {
    return {
      id: this.id,
      type: this.type!,
      notifiedAt: this.notifiedAt ? getUnixTime(this.notifiedAt) : undefined,
    };
  }

  abstract toString(): string;

  toContent(): string {
    return "";
  }
}
