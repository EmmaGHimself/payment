import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ChargeStatus } from '../../common/constants/status.constants';

@Entity('service_log')
@Index(['identifier'])
@Index(['service'])
@Index(['status'])
@Index(['createdAt'])
export class ServiceLogEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'charge_id' })
  chargeId: number;

  @Column()
  identifier: string;

  @Column()
  service: string;

  @Column({ type: 'text' })
  request: string;

  @Column({ type: 'text', nullable: true })
  response: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'successful', 'failed', 'cancelled', 'processing', 'expired'],
    default: 'pending',
  })
  status: ChargeStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
