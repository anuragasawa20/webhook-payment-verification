import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export enum TransactionStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  FAILED = "failed",
}

@Entity("transactions")
export class Transaction {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  @Index()
  event_id: string;

  @Column({ unique: true })
  @Index()
  transaction_id: string;

  @Column("decimal", { precision: 10, scale: 2 })
  amount: number;

  @Column({ length: 3 })
  currency: string;

  @Column()
  sender_id: string;

  @Column()
  sender_name: string;

  @Column({ length: 2 })
  sender_country: string;

  @Column()
  receiver_id: string;

  @Column()
  receiver_name: string;

  @Column({ length: 2 })
  receiver_country: string;

  @Column({
    type: "enum",
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column()
  payment_method: string;

  // Derived fields (Bonus)
  @Column("decimal", { precision: 10, scale: 2, nullable: true })
  processing_fee: number;

  @Column("decimal", { precision: 10, scale: 2, nullable: true })
  net_amount: number;

  @Column("decimal", { precision: 10, scale: 6, nullable: true })
  exchange_rate: number;

  // Metadata
  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>;

  @Column({ type: "timestamp", nullable: true })
  processed_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

// Audit Log Entity
@Entity("audit_logs")
export class AuditLog {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  event_id: string;

  @Column()
  event_type: string;

  @Column({ type: "jsonb" })
  payload: Record<string, any>;

  @Column({ default: "received" })
  status: string;

  @Column({ type: "text", nullable: true })
  error_message: string;

  @CreateDateColumn()
  created_at: Date;
}
