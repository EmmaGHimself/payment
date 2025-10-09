import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { PaymentRequestStatus } from '../../common/constants/status.constants';

@Entity('payment_requests')
@Index(['identifier'], { unique: true })
@Index(['integrationId'])
@Index(['status'])
export class PaymentRequestEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  identifier: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  amount: number;

  @Column({
    type: 'enum',
    enum: ['enabled', 'disabled', 'expired'],
    default: 'enabled',
  })
  status: PaymentRequestStatus;

  @Column({ nullable: true, name: 'integration_id' })
  integrationId: number;

  @Column({ nullable: true })
  bearer: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
