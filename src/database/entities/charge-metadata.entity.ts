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

@Entity('charge_metadata')
@Index(['chargeId', 'name'], { unique: true })
@Index(['name'])
export class ChargeMetadataEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'charge_id' })
  chargeId: number;

  @Column()
  name: string;

  @Column({ type: 'text' })
  value: string;

  @ManyToOne(() => ChargeEntity, (charge) => charge.metadata, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chargeId' })
  charge: ChargeEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
