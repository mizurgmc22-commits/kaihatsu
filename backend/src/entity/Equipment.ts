import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Reservation } from "./Reservation";
import { EquipmentCategory } from "./EquipmentCategory";

@Entity()
export class Equipment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar" })
  name!: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column("int")
  quantity!: number;

  @Column({ type: "varchar", nullable: true })
  location?: string;

  @Column({ type: "varchar", nullable: true })
  imageUrl?: string;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @Column({ type: "boolean", default: false })
  isUnlimited!: boolean;

  @Column({ type: "boolean", default: false })
  isDeleted!: boolean;

  @Column({ type: "json", nullable: true })
  specifications?: Record<string, unknown>;

  @ManyToOne(() => EquipmentCategory, (category) => category.equipments, {
    nullable: true,
  })
  category?: EquipmentCategory;

  @OneToMany(() => Reservation, (reservation) => reservation.equipment)
  reservations!: Reservation[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
