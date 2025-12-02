import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';
import { User } from './User';
import { Equipment } from './Equipment';

export enum ReservationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed'
}

@Entity()
export class Reservation {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, (user) => user.reservations, { nullable: true, onDelete: 'CASCADE' })
  user?: User;

  @ManyToOne(() => Equipment, (equipment) => equipment.reservations, {
    nullable: true,
    onDelete: 'CASCADE'
  })
  equipment?: Equipment | null;

  @Column({ nullable: true })
  customEquipmentName?: string;

  // 申請者情報
  @Column({ nullable: false })
  department!: string;

  @Column({ nullable: false })
  applicantName!: string;

  @Column({ nullable: false })
  contactInfo!: string;

  @Column('datetime')
  startTime!: Date;

  @Column('datetime')
  endTime!: Date;

  @Column('int', { default: 1 })
  quantity!: number;

  @Column('text', { nullable: true })
  purpose?: string;

  @Column('text', { nullable: true })
  location?: string;
  
  @Column('varchar', { length: 20, default: 'pending' })
  status!: string;

  @Column('text', { nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}