import { AuthService } from '../service/authService.js';

export const register = async (req, res) => {
  try {
    const result = await AuthService.register(req.body);
    res.status(result.success ? 201 : 200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const result = await AuthService.verifyOtp(req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const resendOtp = async (req, res) => {
  try {
    const result = await AuthService.resendOtp(req.body.email);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const result = await AuthService.login(req.body);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const result = await AuthService.refreshToken(refreshToken);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    await AuthService.logout(req.user.id);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getProfile = async (req, res) => {
  try {

    if (!req.user?.id) {
      console.error('NO USER ID:', req.user);
      return res.status(401).json({ 
        error: 'User not authenticated',
        success: false 
      });
    }

    console.log(' Profile for userId:', req.user.id);
    const profile = await AuthService.getProfile(req.user.id);
    res.json({ success: true, data: profile });
  } catch (error) {
    console.error('Profile error:', error.message);
    res.status(404).json({ error: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ 
        error: 'User not authenticated',
        success: false 
      });
    }

    const profile = await AuthService.updateProfile(req.user.id, req.body);
    res.json({ success: true, data: profile });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
