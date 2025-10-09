import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('request_log')
@Index(['service'])
@Index(['endpoint'])
@Index(['createdAt'])
export class RequestLogEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  service: string;

  @Column()
  endpoint: string;

  @Column({ type: 'text' })
  request: string;

  @Column({ type: 'text', nullable: true })
  response: string;

  @Column({ nullable: true })
  chargeId: number;

  @Column({ nullable: true })
  channel: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
