import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('merchants')
@Index(['externalId'], { unique: true })
@Index(['status'])
export class MerchantEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  externalId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ nullable: true })
  webhookUrl: string;

  @Column({ default: 'enabled' })
  status: string;

  @Column({ nullable: true })
  livePublicKey: string;

  @Column({ nullable: true })
  testPublicKey: string;

  @Column({ nullable: true })
  liveSecretKey: string;

  @Column({ nullable: true })
  testSecretKey: string;

  @Column({ type: 'json', nullable: true })
  paymentGatewayChannel: Record<string, any>;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  businessTransactionAmountLimit: number;

  @Column({ type: 'json', nullable: true })
  configs: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}