import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  BelongsTo,
  DataType,
  HasMany
} from "sequelize-typescript";
import Company from "./Company";
import PerformanceCampaign from "./PerformanceCampaign";
import Employee from "./Employee";
import EmployeeGoal from "./EmployeeGoal";

@Table
class Goal extends Model<Goal> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  name: string;

  @Column
  description: string;

  @Column
  metricType: string;

  @Column
  target: number;

  @Column
  current: number;

  @Column
  startDate: Date;

  @Column
  endDate: Date;

  @Column
  reward: string;

  @Column
  rewardValue: number;

  @Column
  rewardStatus: string;

  @Column
  multiEmployee: boolean;

  @Column
  dividedGoal: boolean;

  @Column
  originalTarget: number;

  @Column
  totalEmployees: number;

  @ForeignKey(() => PerformanceCampaign)
  @Column
  performanceCampaignId: number;

  @BelongsTo(() => PerformanceCampaign)
  performanceCampaign: PerformanceCampaign;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @Column({
    type: DataType.ARRAY(DataType.INTEGER)
  })
  employees: number[];

  @HasMany(() => EmployeeGoal)
  employeeGoals: EmployeeGoal[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @Column(DataType.TEXT)
  productConfig: string; 
}

export default Goal;