import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  BelongsTo
} from "sequelize-typescript";

import User from "./User";
import Goal from "./Goal";
import Employee from "./Employee";
import Company from "./Company";

@Table
class AuditLog extends Model<AuditLog> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => User)
  @Column
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @Column
  userName: string;

  @Column
  ip: string;

  @Column
  userAgent: string;

  @ForeignKey(() => Goal)
  @Column
  goalId: number;

  @BelongsTo(() => Goal)
  goal: Goal;

  @Column
  goalName: string;

  @ForeignKey(() => Employee)
  @Column
  employeeId: number;

  @BelongsTo(() => Employee)
  employee: Employee;

  @Column
  employeeName: string;

  @Column(DataType.FLOAT)
  oldValue: number;

  @Column(DataType.FLOAT)
  newValue: number;

  @Column
  changeType: string; // "increase", "decrease", "neutral"

  @Column
  justification: string;

  @Column
  metricType: string;

  @Column(DataType.FLOAT)
  individualTarget: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default AuditLog;