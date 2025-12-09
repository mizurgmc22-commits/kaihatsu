import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';
import { Reservation } from './Reservation';
import { EquipmentCategory } from './EquipmentCategory';

@Entity()
export class Equipment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column('int')
  quantity!: number;

  @Column({ nullable: true })
  location?: string;

  @Column({ nullable: true })
  imageUrl?: string;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ default: false })
  isUnlimited!: boolean;

  @Column({ default: false })
  isDeleted!: boolean;

  @Column({ type: 'json', nullable: true })
  specifications?: Record<string, unknown>;

  @ManyToOne(() => EquipmentCategory, (category) => category.equipments, {
    nullable: true
  })
  category?: EquipmentCategory;

  @OneToMany(() => Reservation, (reservation) => reservation.equipment)
  reservations!: Reservation[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
