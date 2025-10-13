import {
  AllowNull,
  AutoIncrement,
  Column,
  CreatedAt,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
  DataType
} from "sequelize-typescript";
import Company from "./Company";

@Table
class ActionPlan extends Model<ActionPlan> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column
  acao: string;

  @AllowNull(false)
  @Column
  motivo: string;

  @AllowNull(true)
  @Column
  meta: string;

  @AllowNull(false)
  @Column
  companyId: number;

  @AllowNull(false)
  @Column({
    type: DataType.JSONB,
    allowNull: false,
    defaultValue: []
  })
  metas!: any[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default ActionPlan;