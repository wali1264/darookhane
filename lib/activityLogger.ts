import { db } from '../db';
import { ActivityLog, ActivityActionType, ActivityEntityType } from '../types';

// This is a redefinition for the logger's context, as it can't import from a context file.
interface AuthenticatedUser {
  id: number; // Changed to number to match our custom users table
  username: string;
  type: 'employee' | 'supplier';
}

/**
 * A centralized function to log significant user activities to the database.
 * It automatically retrieves the current user from session storage.
 *
 * @param actionType The type of action (e.g., 'CREATE', 'UPDATE', 'DELETE').
 * @param entity The type of entity being acted upon (e.g., 'Drug', 'SaleInvoice').
 * @param entityId The ID of the entity.
 * @param details An object containing relevant data about the action (e.g., old/new values, created object).
 */
export async function logActivity(
    actionType: ActivityActionType,
    entity: ActivityEntityType,
    entityId: number | string,
    details: any
) {
    try {
        const storedUserJson = sessionStorage.getItem('shafayar_user');
        if (!storedUserJson) {
            console.warn("No user found in session for activity logging. Action will not be logged.");
            return;
        }
        const currentUser: AuthenticatedUser = JSON.parse(storedUserJson);

        // Don't log activities from suppliers in the main log
        if (currentUser.type === 'supplier') {
            return;
        }

        const logEntry: Omit<ActivityLog, 'id'> = {
            timestamp: new Date().toISOString(),
            userId: Number(currentUser.id), // Ensure it's a number
            username: currentUser.username,
            actionType,
            entity,
            entityId: String(entityId),
            // FIX: Sanitize the details object to prevent DataCloneError for non-serializable properties
            details: JSON.parse(JSON.stringify(details))
        };
        
        await db.activityLog.add(logEntry as ActivityLog);

    } catch (error) {
        console.error("Failed to log activity:", error);
    }
}