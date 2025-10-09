import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ChargeEntity } from './charge.entity';

@Entity('settlements')
@Index(['chargeId'], { unique: true })
@Index(['status'])
@Index(['settlementDate'])
export class SettlementEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'charge_id' })
  chargeId: number;

  @Column('decimal', { precision: 15, scale: 2 })
  amount: number;

  @Column('decimal', { precision: 15, scale: 2 })
  fee: number;

  @Column('decimal', { precision: 15, scale: 2 })
  netAmount: number;

  @Column({ default: 'NGN' })
  currency: string;

  @Column({ default: 'pending' })
  status: string; // pending, completed, failed

  @Column({ nullable: true })
  settlementReference: string;

  @Column({ nullable: true })
  settlementAccount: string;

  @Column({ nullable: true })
  bankCode: string;

  @Column({ nullable: true })
  accountNumber: string;

  @Column({ nullable: true })
  accountName: string;

  @Column({ type: 'json', nullable: true })
  settlementData: Record<string, any>;

  @Column({ type: 'datetime', nullable: true })
  settlementDate: Date;

  @Column({ default: false })
  manualSettlement: boolean;

  @Column({ nullable: true })
  reason: string;

  @ManyToOne(() => ChargeEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'charge_id' })
  charge: ChargeEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
