const db = require('../config/db');

class ChatQueue {
  static async addToQueue(studentId, { feeling, phq9, bdi2, gad7, dass21 }) {
    const query = `
      INSERT INTO chat_queue (student_id, feeling, phq9, bdi2, gad7, dass21)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id;
    `;
    const values = [studentId, feeling, phq9, bdi2, gad7, dass21];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  static async findMatch(studentId, { feeling, phq9, bdi2, gad7, dass21 }) {
    // Find a potential match with the same feeling and similar scores
    const query = `
      SELECT id, student_id 
      FROM chat_queue 
      WHERE student_id != $1 
        AND feeling = $2
        AND ABS(phq9 - $3) <= 5
        AND ABS(bdi2 - $4) <= 5
        AND ABS(gad7 - $5) <= 5
        AND ABS(dass21 - $6) <= 5
      ORDER BY joined_at ASC
      LIMIT 1;
    `;
    const values = [studentId, feeling, phq9, bdi2, gad7, dass21];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  static async removeFromQueue(studentId) {
    const query = 'DELETE FROM chat_queue WHERE student_id = $1';
    await db.query(query, [studentId]);
  }

  static async removeById(id) {
    const query = 'DELETE FROM chat_queue WHERE id = $1';
    await db.query(query, [id]);
  }
}

module.exports = ChatQueue;