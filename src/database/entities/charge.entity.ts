import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ChargeStatus } from '../../common/constants/status.constants';
import { CurrencyCode } from '../../common/constants/payment.constants';
import { ChargeInfoEntity } from './charge-info.entity';
import { ChargeHistoryEntity } from './charge-history.entity';
import { ChargeMetadataEntity } from './charge-metadata.entity';

@Entity('charge')
@Index(['identifier'], { unique: true })
@Index(['status'])
@Index(['merchantId'])
@Index(['createdAt'])
export class ChargeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  identifier: string;

  @Column('decimal', { precision: 15, scale: 2 })
  amount: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true, name: 'original_amount' })
  originalAmount: number;

  @Column({
    type: 'enum',
    enum: ['NGN', 'USD', 'GBP', 'EUR'],
    default: 'NGN',
  })
  currency: CurrencyCode;

  @Column()
  description: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ name: 'customer_id' })
  customerId: string;

  @Column({ name: 'merchant_id' })
  merchantId: string;

  @Column({ name: 'merchant_name' })
  merchantName: string;

  @Column({ nullable: true, name: 'logo_url' })
  logoUrl: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'successful', 'failed', 'cancelled', 'processing', 'expired'],
    default: 'pending',
  })
  status: ChargeStatus;

  @Column({ default: false })
  successful: boolean;

  @Column({ default: false })
  settled: boolean;

  @Column({ nullable: true })
  service: string;

  @Column({ nullable: true, name: 'channel_id' })
  channelId: number;

  @Column({ nullable: true, name: 'charge_info_id' })
  chargeInfoId: number;

  @Column({ nullable: true })
  callback: string;

  @Column({ default: false })
  livemode: boolean;

  @Column({ nullable: true })
  source: string;

  @Column({ nullable: true, type: 'int', name: 'otp_count' })
  otpCount: number;

  @ManyToOne(() => ChargeInfoEntity, (chargeInfo) => chargeInfo.charges)
  @JoinColumn({ name: 'charge_info_id' })
  chargeInfo: ChargeInfoEntity;

  @OneToMany(() => ChargeHistoryEntity, (history) => history.charge)
  history: ChargeHistoryEntity[];

  @OneToMany(() => ChargeMetadataEntity, (metadata) => metadata.charge)
  metadata: ChargeMetadataEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
