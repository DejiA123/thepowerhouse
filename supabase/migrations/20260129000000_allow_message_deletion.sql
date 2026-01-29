-- Drop the policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Users can update their own messages" ON chat_messages;

-- Create the policy
-- USING: Determines which rows can be updated (only own messages)
-- WITH CHECK: Determines if the new state of the row is valid (user_id must still match)
CREATE POLICY "Users can update their own messages"
ON chat_messages
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
