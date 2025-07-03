import * as uuid from "uuid";
import {
  INotiCondPair,
  NotiCondPairJSON,
  NotiStatus,
  INotiCond,
} from "./notification.types";
import { ConditionFactory } from "./conditions/ConditionFactory";
import { fromUnixTime, getUnixTime } from "date-fns";

export class NotiCondPair implements INotiCondPair {
  public readonly id: string;
  public active: boolean = true;
  public status: NotiStatus = null;
  public readonly createdAt: Date;
  public confirmed: boolean = false;

  constructor(
    public eventCond: INotiCond,
    public timeoutCond: INotiCond | null
  ) {
    this.id = uuid.v4();
    this.createdAt = new Date();
  }

  // Getters for status checking
  get isWatching(): boolean {
    return this.status === null;
  }

  get isSatisfied(): boolean {
    return this.status === "satisfied";
  }

  get isExpired(): boolean {
    return this.status === "expired";
  }

  // Serialization
  toJSON(): NotiCondPairJSON {
    return {
      id: this.id,
      eventCond: this.eventCond.toJSON(),
      timeoutCond: this.timeoutCond?.toJSON() || null,
      createdAt: getUnixTime(this.createdAt),
      active: this.active,
      status: this.status,
      confirmed: this.confirmed,
    };
  }

  // Factory method for deserialization
  static fromJSON(json: NotiCondPairJSON): NotiCondPair {
    const eventCond = ConditionFactory.fromJSON(json.eventCond);
    const timeoutCond = json.timeoutCond
      ? ConditionFactory.fromJSON(json.timeoutCond)
      : null;

    const pair = new NotiCondPair(eventCond, timeoutCond);

    // Restore properties
    Object.assign(pair, {
      id: json.id,
      active: json.active,
      status: json.status,
      confirmed: json.confirmed,
    });

    // Override readonly createdAt
    (pair as any).createdAt = fromUnixTime(json.createdAt);

    return pair;
  }

  // Helper methods
  markAsSatisfied(): void {
    this.status = "satisfied";
  }

  markAsExpired(): void {
    this.status = "expired";
  }

  setActive(active: boolean): void {
    this.active = active;
  }

  confirm(): void {
    this.confirmed = true;
  }

  // Get display information
  getStatusText(): string {
    if (this.isSatisfied) {
      return "Satisfied";
    }
    if (this.isExpired) {
      return "Expired";
    }
    return "Watching";
  }

  getDescription(): string {
    const eventDesc = this.eventCond.toString();
    const timeoutDesc = this.timeoutCond?.toString();

    if (timeoutDesc) {
      return `${eventDesc} (Timeout: ${timeoutDesc})`;
    }
    return eventDesc;
  }
}
