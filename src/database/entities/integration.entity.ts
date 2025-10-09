import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('integration')
@Index(['publicKey'], { unique: true })
@Index(['secretKey'], { unique: true })
@Index(['status'])
export class IntegrationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ name: 'public_key' })
  publicKey: string;

  @Column({ name: 'secret_key' })
  secretKey: string;

  @Column({ default: 'enabled' })
  status: string;

  @Column()
  identity: string;

  // @Column({ type: 'json', nullable: true })
  configs: {
    logo_url?: string;
    channel_config?: Record<string, any>;
    amount_limit?: number;
    fee_bearer?: string;
    referrer_code?: string;
    legacy_merchant_id?: string;
    [key: string]: any;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
