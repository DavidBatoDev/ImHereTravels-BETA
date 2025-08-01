import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from '@/lib/firebase';
import { UserProfile, CreateUserData, UpdateUserData } from '@/types/user';

const USERS_COLLECTION = 'users';

export class UserService {
  /**
   * Create a new user profile in Firestore
   */
  static async createUserProfile(
    firebaseUser: User,
    additionalData?: Partial<CreateUserData>
  ): Promise<UserProfile> {
    const userRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
    
    const userData: Omit<UserProfile, 'createdAt' | 'updatedAt'> = {
      uid: firebaseUser.uid,
      email: firebaseUser.email!,
      displayName: additionalData?.displayName || firebaseUser.displayName || '',
      photoURL: additionalData?.photoURL || firebaseUser.photoURL || undefined,
      phoneNumber: additionalData?.phoneNumber || firebaseUser.phoneNumber || undefined,
      preferences: {
        currency: 'USD',
        language: 'en',
        dietaryRestrictions: [],
        travelStyle: [],
        newsletter: true,
        smsNotifications: false,
      },
      bookingHistory: [],
      isActive: true,
      role: 'user',
    };

    const userWithTimestamps = {
      ...userData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    };

    await setDoc(userRef, userWithTimestamps);

    // Return the user data with current timestamp
    return {
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date(),
    };
  }

  /**
   * Get user profile from Firestore
   */
  static async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const userRef = doc(db, USERS_COLLECTION, uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        return {
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          lastLoginAt: data.lastLoginAt?.toDate(),
        } as UserProfile;
      }

      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  /**
   * Update user profile in Firestore
   */
  static async updateUserProfile(
    uid: string,
    updateData: UpdateUserData
  ): Promise<void> {
    try {
      const userRef = doc(db, USERS_COLLECTION, uid);
      
      await updateDoc(userRef, {
        ...updateData,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  /**
   * Update last login timestamp
   */
  static async updateLastLogin(uid: string): Promise<void> {
    try {
      const userRef = doc(db, USERS_COLLECTION, uid);
      await updateDoc(userRef, {
        lastLoginAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating last login:', error);
      // Don't throw error for login timestamp update failure
    }
  }

  /**
   * Check if user profile exists
   */
  static async userProfileExists(uid: string): Promise<boolean> {
    try {
      const userRef = doc(db, USERS_COLLECTION, uid);
      const userSnap = await getDoc(userRef);
      return userSnap.exists();
    } catch (error) {
      console.error('Error checking user profile existence:', error);
      return false;
    }
  }

  /**
   * Get user by email (admin function)
   */
  static async getUserByEmail(email: string): Promise<UserProfile | null> {
    try {
      const usersRef = collection(db, USERS_COLLECTION);
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        return {
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          lastLoginAt: data.lastLoginAt?.toDate(),
        } as UserProfile;
      }

      return null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw error;
    }
  }

  /**
   * Deactivate user account
   */
  static async deactivateUser(uid: string): Promise<void> {
    try {
      const userRef = doc(db, USERS_COLLECTION, uid);
      await updateDoc(userRef, {
        isActive: false,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error deactivating user:', error);
      throw error;
    }
  }

  /**
   * Reactivate user account
   */
  static async reactivateUser(uid: string): Promise<void> {
    try {
      const userRef = doc(db, USERS_COLLECTION, uid);
      await updateDoc(userRef, {
        isActive: true,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error reactivating user:', error);
      throw error;
    }
  }
}