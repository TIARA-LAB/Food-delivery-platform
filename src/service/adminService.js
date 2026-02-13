// AdminService.js - COMPLETE CORRECTED FILE
import AdminRepository from '../repository/adminRepository.js';

export default class AdminService {
  constructor() {
    this.repo = new AdminRepository();
  }

  async getDashboardStats() { 
    return this.repo.getDashboardStats(); 
  }
  
  async getUsers(query) { 
    return this.repo.getUsers(query); 
  }
  
  async getVendors(query) { 
    return this.repo.getVendors(query); 
  }
  
  async approveVendor(id) { 
    return this.repo.approveVendor(id); 
  }
  
  async updateUserRole(id, role) { 
    return this.repo.updateUserRole(id, role); 
  }
  
  async getCustomers(query) { 
    return this.repo.getCustomers(query); 
  }
  
  async getAnalytics(query) { 
    return this.repo.getAnalytics(query); 
  }
  
  async getVendorOrders(vendorId, query) { 
    return this.repo.getVendorOrders(vendorId, query); 
  }
  
  async getVendorOrdersCount(vendorId) { 
    return this.repo.getVendorOrdersCount(vendorId); 
  }
  
  async getReviews(query) { 
    return this.repo.getReviews(query); 
  }
}
