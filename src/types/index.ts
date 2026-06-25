export type Notation = "IDEF0" | "BPMN" | "EPC" | "PROCEDURE";
export type RaciType = "RESPONSIBLE" | "ACCOUNTABLE" | "CONSULTED" | "INFORMED";
export type OrgUnitType = "COMPANY" | "DIVISION" | "DEPARTMENT" | "GROUP";
export type ProjectStatus = "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";

export interface Goal {
  id: string;
  name: string;
  description?: string | null;
  weight?: number | null;
  strategyId?: string | null;
  ownerId?: string | null;
  owner?: Position | null;
  indicators?: Indicator[];
  createdAt: string;
  updatedAt: string;
}

export interface IndicatorValue {
  id: string;
  period: string;
  value: number;
  note?: string | null;
  indicatorId: string;
  createdAt: string;
}

export interface Indicator {
  id: string;
  name: string;
  description?: string | null;
  unit?: string | null;
  targetValue?: number | null;
  actualValue?: number | null;
  frequency?: string | null;
  deadline?: string | null;
  goalId?: string | null;
  goal?: Goal | null;
  processId?: string | null;
  process?: Process | null;
  ownerId?: string | null;
  owner?: Position | null;
  values?: IndicatorValue[];
  createdAt: string;
  updatedAt: string;
}

export interface Process {
  id: string;
  name: string;
  description?: string | null;
  notation: Notation;
  code?: string | null;
  parentId?: string | null;
  ownerRoleId?: string | null;
  ownerRole?: Position | null;
  children?: Process[];
  indicators?: Indicator[];
  createdAt: string;
  updatedAt: string;
}

export interface OrgUnit {
  id: string;
  name: string;
  description?: string | null;
  type: OrgUnitType;
  parentId?: string | null;
  children?: OrgUnit[];
  positions?: Position[];
  createdAt: string;
  updatedAt: string;
}

export interface Position {
  id: string;
  name: string;
  description?: string | null;
  orgUnitId?: string | null;
  orgUnit?: OrgUnit | null;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  deadline?: string | null;
  ownerId?: string | null;
  owner?: Position | null;
  createdAt: string;
  updatedAt: string;
}

export interface StrategyMapLink {
  id: string;
  boardId: string;
  sourceGoalId: string;
  targetGoalId: string;
  strength: number;
}

export interface StrategyMapRegion {
  id: string;
  label: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  boardId: string;
}

export interface StrategyMapIndicatorEntry {
  id: string;
  x: number;
  y: number;
  boardId: string;
  indicatorId: string;
  indicator: Indicator;
}

export interface StrategyMapIndicatorLink {
  id: string;
  boardId: string;
  indicatorId: string;
  goalId: string;
  strength: number;
}

export interface StrategyMapBoard {
  id: string;
  name: string;
  companyId: string;
  entries: StrategyMapEntry[];
  links: StrategyMapLink[];
  regions: StrategyMapRegion[];
  indicatorEntries: StrategyMapIndicatorEntry[];
  indicatorLinks: StrategyMapIndicatorLink[];
  createdAt: string;
  updatedAt: string;
}

export interface StrategyMapEntry {
  id: string;
  x: number;
  y: number;
  boardId: string;
  goalId: string;
  goal: Goal;
}
