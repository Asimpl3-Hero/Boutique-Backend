export interface Customer {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}
