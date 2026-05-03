import { v4 as uuidv4 } from 'uuid';
import User from '../models/User.js';

async function generateUniqueColor() {
  const existingUsers = await User.find({}, 'color').lean();
  const existingColors = new Set(existingUsers.map(u => u.color));

  const goldenAngle = 137.5;
  let attempts = 0;
  const maxAttempts = 1000;

  while (attempts < maxAttempts) {
    const hue = (attempts * goldenAngle) % 360;
    
    const saturationVariant = attempts % 4;
    const lightnessVariant = Math.floor(attempts / 4) % 3;
    
    const saturation = 0.75 + (saturationVariant * 0.05);
    
    const lightness = 0.50 + (lightnessVariant * 0.08);
    
    const color = hslToHex(hue, saturation, lightness);
    
    if (!existingColors.has(color) && isColorDistinct(color, existingColors)) {
      return color;
    }
    
    attempts++;
  }

  let fallbackAttempts = 0;
  while (fallbackAttempts < 100) {
    const hue = Math.random() * 360;
    const saturation = 0.7 + Math.random() * 0.25;
    const lightness = 0.45 + Math.random() * 0.25;
    const color = hslToHex(hue, saturation, lightness);
    
    if (!existingColors.has(color) && isColorDistinct(color, existingColors)) {
      return color;
    }
    fallbackAttempts++;
  }

  while (true) {
    const color = hslToHex(Math.random() * 360, 0.8, 0.6);
    if (!existingColors.has(color)) {
      return color;
    }
  }
}

function isColorDistinct(newColor, existingColors) {
  if (existingColors.size === 0) return true;
  
  const newRgb = hexToRgb(newColor);
  const minDistance = 80;
  
  for (const existingColor of existingColors) {
    const existingRgb = hexToRgb(existingColor);
    const distance = colorDistance(newRgb, existingRgb);
    
    if (distance < minDistance) {
      return false;
    }
  }
  
  return true;
}

function colorDistance(rgb1, rgb2) {
  const dr = rgb1.r - rgb2.r;
  const dg = rgb1.g - rgb2.g;
  const db = rgb1.b - rgb2.b;
  
  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db);
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function hslToHex(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export async function registerUser(req, res) {
  const { email } = req.body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  try {
    let user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      user = await User.create({
        userId: uuidv4(),
        email: email.toLowerCase().trim(),
        color: await generateUniqueColor(),
      });
    }

    return res.json({
      userId: user.userId,
      email: user.email,
      color: user.color,
      token: user.userId,
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

export async function getMe(req, res) {
  const authHeader = req.headers.authorization;
  const userId = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ userId: user.userId, email: user.email, color: user.color });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}
