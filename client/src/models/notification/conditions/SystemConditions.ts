import { BaseNotiCond } from "./BaseNotiCond";
import { NotiType, NotiCondJSON } from "../notification.types";

export class LowUtilizationCond extends BaseNotiCond {
  name = "lowUtilization";
  type = NotiType.LOW_UTILIZATION;
  utilization = 1;

  toJSON(): NotiCondJSON {
    return {
      ...super.toJSON(),
      utilization: this.utilization,
    };
  }

  toString(): string {
    return "Low Utilization";
  }

  toContent(): string {
    return `Default: ${this.utilization}%`;
  }
}

export class HighTemperatureCond extends BaseNotiCond {
  name = "highTemperature";
  type = NotiType.HIGH_TEMPERATURE;
  temperature = 90;

  toJSON(): NotiCondJSON {
    return {
      ...super.toJSON(),
      temperature: this.temperature,
    };
  }

  toString(): string {
    return "High Temperature";
  }

  toContent(): string {
    return `Default: ${this.temperature}°C`;
  }
}

export class ExceptionHappenCond extends BaseNotiCond {
  name = "exceptionHappen";
  type = NotiType.EXCEPTION_HAPPEN;

  toString(): string {
    return "Exception Raised";
  }
}

export class HighUsageCond extends BaseNotiCond {
  name = "highUsage";
  type = NotiType.HIGH_USAGE;
  usage = 85;

  toJSON(): NotiCondJSON {
    return {
      ...super.toJSON(),
      usage: this.usage,
    };
  }

  toString(): string {
    return "High Disk Usage";
  }

  toContent(): string {
    return `Default: ${this.usage}%`;
  }
}
