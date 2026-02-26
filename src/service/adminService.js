import AdminRepository from '../repository/adminRepository.js';

export default class AdminService {
  constructor() {
    this.repo = new AdminRepository();
  }

  async createSuperAdmin(data) {
    return this.repo.createSuperAdmin(data);
  }

  async adminLogin(adminApiKey) {
    return this.repo.findAdminByApiKey(adminApiKey);
  }

  async createUser(data) {
    return this.repo.createUser(data);
  }

  async getDashboardStats() {
    return this.repo.getDashboardStats();
  }

  async getUsers(query) {
    return this.repo.getUsers(query);
  }

  async updateUserRole(userId, role) {
    return this.repo.updateUserRole(userId, role);
  }

  async getVendors(query) {
    return this.repo.getVendors(query);
  }

  async getCustomers(query) {
    return this.repo.getCustomers(query);
  }
}
