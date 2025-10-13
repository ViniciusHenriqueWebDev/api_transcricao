import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  HasMany,
  Unique
} from "sequelize-typescript";

@Table({ tableName: "Invoices" })
class Invoices extends Model<Invoices> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  detail: string;

  @Column
  status: string;

  @Column
  value: number;

  @AllowNull(true)
  @Column
  paymentMethod: string;

  @AllowNull(true)
  @Column
  paymentId: string;

  @AllowNull(true)
  @Column
  paymentUrl: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @Column
  dueDate: string;

  @Column
  companyId: number;

}

export default Invoices;
