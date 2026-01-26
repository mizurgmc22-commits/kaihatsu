import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

export enum ContentType {
  ANNOUNCEMENT = "announcement",
  GUIDE = "guide",
  FLOW = "flow",
  PDF = "pdf",
  LINK = "link",
}

@Entity("dashboard_content")
export class DashboardContent {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({
    type: "varchar",
    length: 50,
  })
  type!: ContentType;

  @Column({ type: "varchar", length: 255 })
  title!: string;

  @Column({ type: "text", nullable: true })
  content!: string | null;

  @Column({ type: "text", nullable: true })
  fileUrl!: string | null;

  @Column({ type: "text", nullable: true })
  linkUrl!: string | null;

  @Column({ type: "int", default: 0 })
  order!: number;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
