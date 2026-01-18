import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
} from "typeorm";
import { Reservation } from "./Reservation";

export type UserRole = "user" | "admin" | "system_admin";

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar" })
  name!: string;

  @Column({ type: "varchar", unique: true })
  email!: string;

  @Column({ type: "varchar", select: false })
  password!: string;

  @Column({ type: "varchar", default: "user" })
  role!: UserRole;

  @Column({ type: "varchar" })
  department!: string;

  @Column({ type: "varchar", name: "phone_number", nullable: true })
  phoneNumber?: string;

  @Column({ type: "varchar", name: "extension_number", nullable: true })
  extensionNumber?: string;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @Column({ name: "last_login_at", type: "datetime", nullable: true })
  lastLoginAt?: Date;

  @OneToMany(() => Reservation, (reservation) => reservation.user, {
    cascade: true,
  })
  reservations!: Reservation[];

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  @Column({ name: "deleted_at", type: "datetime", nullable: true })
  deletedAt?: Date;

  @BeforeInsert()
  @BeforeUpdate()
  emailToLowerCase() {
    this.email = this.email.toLowerCase();
  }
}
