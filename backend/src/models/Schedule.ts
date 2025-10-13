import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  DataType,
  BelongsTo,
  ForeignKey
} from "sequelize-typescript";
import Company from "./Company";
import Contact from "./Contact";
import Ticket from "./Ticket";
import User from "./User";
import Whatsapp from "./Whatsapp";
import Queue from "./Queue";

@Table
class Schedule extends Model<Schedule> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column(DataType.TEXT)
  body: string;

  @Column
  sendAt: Date;

  @Column
  sentAt: Date;

  @ForeignKey(() => Contact)
  @Column
  contactId: number;

  @ForeignKey(() => Ticket)
  @Column
  ticketId: number;

  @ForeignKey(() => User)
  @Column
  userId: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @Column(DataType.STRING)
  status: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @BelongsTo(() => Contact, "contactId")
  contact: Contact;

  @BelongsTo(() => Ticket)
  ticket: Ticket;

  @BelongsTo(() => User)
  user: User;

  @BelongsTo(() => Company)
  company: Company;

  @Column
  mediaPath: string;

  @Column
  mediaName: string;

   @Column(DataType.BOOLEAN)
  recurrence: boolean;

  @Column(DataType.STRING)
  recurrenceInterval: string;

  @Column(DataType.INTEGER)
  recurrenceValue: number;

  @Column(DataType.INTEGER)
  recurrenceCount: number;

  @Column(DataType.STRING)
  recurrenceDayOptions: string;

  @Column(DataType.BOOLEAN)
  sendSignature: boolean;

  @Column(DataType.JSON)
  whatsappData: any;

  @Column(DataType.JSON)
  queueData: any;

  @Column(DataType.JSON)
  userData: any;

  @Column(DataType.TEXT)
  processedPreview: string;

  @Column(DataType.BOOLEAN)
  openTicket: boolean;

  @Column(DataType.STRING)
  ticketStatus: string;

  @ForeignKey(() => Whatsapp)
  @Column
  whatsappId: number;

  @ForeignKey(() => Queue)
  @Column
  queueId: number;

  @BelongsTo(() => Whatsapp)
  whatsapp: Whatsapp;

  @BelongsTo(() => Queue)
  queue: Queue;
}

export default Schedule;
