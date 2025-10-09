import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ChargeEntity } from './charge.entity';
import { ChargeStatus } from '../../common/constants/status.constants';

@Entity('charge_history')
@Index(['chargeId'])
@Index(['activity'])
@Index(['createdAt'])
export class ChargeHistoryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  chargeId: number;

  @Column()
  description: string;

  @Column({ name: 'response_message' })
  responseMessage: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'successful', 'failed', 'cancelled', 'processing', 'expired'],
  })
  status: ChargeStatus;

  @Column()
  activity: string;

  @Column({ type: 'text', nullable: true })
  response: string | null;

  @ManyToOne(() => ChargeEntity, (charge) => charge.history, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'charge_id' })
  charge: ChargeEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
