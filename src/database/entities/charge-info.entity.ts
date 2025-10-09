import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ChargeEntity } from './charge.entity';
import { PaymentRequestStatus } from '../../common/constants/status.constants';
import { CurrencyCode } from '../../common/constants/payment.constants';

@Entity('charge_info')
@Index(['merchantReference'], { unique: true })
@Index(['merchantId'])
@Index(['status'])
export class ChargeInfoEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('decimal', { precision: 15, scale: 2 })
  amount: number;

  @Column({ name: 'merchant_reference' })
  merchantReference: string;

  @Column({ name: 'customer_id' })
  customerId: string;

  @Column()
  description: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  callback: string;

  @Column({ nullable: true })
  settlementAccount: string;

  @Column({ default: false })
  livemode: boolean;

  @Column({
    type: 'enum',
    enum: ['NGN', 'USD', 'GBP', 'EUR'],
    default: 'NGN',
  })
  currency: CurrencyCode;

  @Column({ name: 'merchant_id' })
  merchantId: string;

  @Column({ nullable: true, name: 'integration_id' })
  integrationId: number;

  @Column({ name: 'merchant_name' })
  merchantName: string;

  @Column({ nullable: true, name: 'logo_url' })
  logoUrl: string;

  @Column({ type: 'json', nullable: true, name: 'merchant_channel_config' })
  merchantChannelConfig: Record<string, any>;

  @Column('decimal', { precision: 15, scale: 2, nullable: true, name: 'transaction_amount_limit' })
  transactionAmountLimit: number;

  @Column({
    type: 'enum',
    enum: ['enabled', 'disabled', 'expired', 'success'],
    default: 'enabled',
  })
  status: PaymentRequestStatus;

  @Column({ nullable: true })
  identifier: string;

  @Column('decimal', { precision: 15, scale: 2, nullable: true, name: 'discount_amount' })
  discountAmount: number;

  @Column({ type: 'json', nullable: true, name: 'discount_info' })
  discountInfo: Record<string, any>;

  @Column({ default: false })
  discounted: boolean;

  @Column({ nullable: true, name: 'payment_request_id' })
  paymentRequestId: number;

  @OneToMany(() => ChargeEntity, (charge) => charge.chargeInfo)
  charges: ChargeEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
