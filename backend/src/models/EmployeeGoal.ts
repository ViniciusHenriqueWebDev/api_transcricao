import {
  Table,
  Column,
  Model,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  CreatedAt,
  UpdatedAt,
  BelongsTo
} from "sequelize-typescript";
import Employee from "./Employee";
import Goal from "./Goal";

@Table
class EmployeeGoal extends Model<EmployeeGoal> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Employee)
  @Column
  employeeId: number;

  @BelongsTo(() => Employee)
  employee: Employee;

  @ForeignKey(() => Goal)
  @Column
  goalId: number;

  @BelongsTo(() => Goal)
  goal: Goal;

  @Column
  individualTarget: number;

  @Column
  individualCurrent: number;

  @Column
  progress: number;

  @Column
  productName: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default EmployeeGoal;