const db = require('../config/db');

class Student {
  static async create({ username, email, password_hash, phq9, bdi2, gad7, dass21, feeling }) {
    const query = `
      INSERT INTO students (username, email, password_hash, phq9, bdi2, gad7, dass21, feeling)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, username, email, phq9, bdi2, gad7, dass21, feeling, created_at;
    `;
    const values = [username, email, password_hash, phq9, bdi2, gad7, dass21, feeling];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM students WHERE email = $1';
    const { rows } = await db.query(query, [email]);
    return rows[0];
  }

  static async findById(id) {
    const query = 'SELECT id, username, email, phq9, bdi2, gad7, dass21, feeling, created_at FROM students WHERE id = $1';
    const { rows } = await db.query(query, [id]);
    return rows[0];
  }

  static async updateScores(id, { phq9, bdi2, gad7, dass21, feeling }) {
    const query = `
      UPDATE students 
      SET phq9 = $1, bdi2 = $2, gad7 = $3, dass21 = $4, feeling = $5
      WHERE id = $6
      RETURNING id, username, email, phq9, bdi2, gad7, dass21, feeling, created_at;
    `;
    const values = [phq9, bdi2, gad7, dass21, feeling, id];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  static async findAll() {
    const query = `
      SELECT id, username, email, phq9, bdi2, gad7, dass21, feeling, created_at
      FROM students
      ORDER BY created_at DESC;
    `;
    const { rows } = await db.query(query);
    return rows;
  }

  static async deleteById(id) {
    // Cascade will delete related chat_queue via FK on student_id
    const query = 'DELETE FROM students WHERE id = $1 RETURNING id;';
    const { rows } = await db.query(query, [id]);
    return rows[0];
  }
}

module.exports = Student;