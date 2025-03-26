// Common types
export interface PaginatedResponse<T> {
  items: T[];
  totalCount?: number;
  hasMore?: boolean;
}

// Response can be either a PaginatedResponse or an array
export type ApiResponse<T> = PaginatedResponse<T> | T[];

// Element types
export enum ElementSearchType {
  Explorer = 1,
  BottomUp = 2,
  CheckIn = 3,
  CheckInObjective = 4,
  CheckInKeyResult = 5
}

export enum ElementType {
  Objective = 1,
  KeyResult = 4,
  JiraIssue = 5
}

export enum GradeType {
  OnTrack = 1,
  Behind = 2,
  AtRisk = 3,
  NotStarted = 4,
  Closed = 5,
  Abandoned = 6,
  Backlog = 9
}

export enum OrderType {
  ElementAsc = 1,
  ElementDesc = 2,
  LevelAsc = 3,
  LevelDesc = 4,
  OwnerAsc = 5,
  OwnerDesc = 6,
  GroupAsc = 7,
  GroupDesc = 8,
  StatusAsc = 9,
  StatusDesc = 10,
  DueDateAsc = 11,
  DueDateDesc = 12,
  CreateDateAsc = 13,
  CreateDateDesc = 14,
  GradeAsc = 15,
  GradeDesc = 16,
  ElementNameAsc = 17,
  ElementNameDesc = 18,
  TypeAsc = 19,
  TypeDesc = 20,
  LabelAsc = 21,
  LabelDesc = 22,
  ElementStartDateAsc = 23,
  ElementStartDateDesc = 24
}

export interface User {
  id: string;
  displayName: string;
  email?: string;
  userName?: string;
  active?: boolean;
  avatarUrl?: string;
}

export interface Element {
  id: number;
  type: ElementType;
  name: string;
  displayId?: string;
  ownerId?: string;
  owner?: User;
  gradeType?: GradeType;
  gradeValue?: number;
  startDate?: string;
  dueDate?: string;
  lastGradeUpdateDate?: string;
  description?: string;
  workspaceId: number;
  children?: Element[];
  stakeholders?: User[];
  parentId?: number;
  levelId?: number;
  groupId?: number;
  intervalId?: number;
  labels?: { id: number; name: string }[];
  watchers?: User[];
}

// Workspace types
export interface Workspace {
  id: number;
  name: string;
  description?: string;
  createdDate: string;
  elementsCount?: number;
}

// Group types
export interface Group {
  id: number;
  name: string;
  workspaceId: number;
  elementsCount?: number;
}

// Interval types
export interface Interval {
  id: number;
  name: string;
  startDate: string;
  dueDate: string;
  workspaceId: number;
  elementsCount?: number;
}

// Level types
export interface Level {
  id: number;
  name: string;
  workspaceId: number;
  elementsCount?: number;
}

// Label types
export interface Label {
  id: number;
  name: string;
  workspaceId: number;
  elementsCount?: number;
}

// User types
export interface UserResponse {
  id: string;
  displayName: string;
  email?: string;
  userName?: string;
  active?: boolean;
  avatarUrl?: string;
} 