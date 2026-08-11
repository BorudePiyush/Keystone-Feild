-- Seed users (password is 'password' for all, BCrypt hashed as $2a$10$/4hFwCJKtxZe05f06uGhmOVIxU9sW5SC61yVsC8SVMUjQG88yMLHS)
INSERT INTO users (name, email, phone, role, password_hash, avatar_url, is_on_duty, latitude, longitude, last_location_update) VALUES
('John Carter', 'manager@keystone.com', '+15550001', 'MANAGER', '$2a$10$/4hFwCJKtxZe05f06uGhmOVIxU9sW5SC61yVsC8SVMUjQG88yMLHS', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&q=80', FALSE, NULL, NULL, NULL),
('Sarah Dispatcher', 'dispatcher@keystone.com', '+15550002', 'DISPATCHER', '$2a$10$/4hFwCJKtxZe05f06uGhmOVIxU9sW5SC61yVsC8SVMUjQG88yMLHS', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80', FALSE, NULL, NULL, NULL),
('Dave Tech (HVAC)', 'tech1@keystone.com', '+15550003', 'TECHNICIAN', '$2a$10$/4hFwCJKtxZe05f06uGhmOVIxU9sW5SC61yVsC8SVMUjQG88yMLHS', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80', TRUE, 40.7128, -74.0060, '2026-07-10 14:00:00'),
('Mike Tech (Plumbing)', 'tech2@keystone.com', '+15550004', 'TECHNICIAN', '$2a$10$/4hFwCJKtxZe05f06uGhmOVIxU9sW5SC61yVsC8SVMUjQG88yMLHS', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80', TRUE, 42.3601, -71.0589, '2026-07-10 14:00:00'),
('Alice Customer (Meridian)', 'customer@keystone.com', '+15550005', 'CUSTOMER', '$2a$10$/4hFwCJKtxZe05f06uGhmOVIxU9sW5SC61yVsC8SVMUjQG88yMLHS', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80', FALSE, NULL, NULL, NULL),
('Bob Customer (Nexus)', 'customer2@keystone.com', '+15550006', 'CUSTOMER', '$2a$10$/4hFwCJKtxZe05f06uGhmOVIxU9sW5SC61yVsC8SVMUjQG88yMLHS', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80', FALSE, NULL, NULL, NULL);

-- Seed customers
INSERT INTO customers (name, contact_email) VALUES
('Meridian Facilities Mgmt', 'contact@meridian.com'),
('Nexus Commercial Real Estate', 'facilities@nexusre.com'),
('Apex Retail Holdings', 'maintenance@apexretail.com');

-- Seed sites
INSERT INTO sites (customer_id, name, address) VALUES
(1, 'HQ Office Tower', '123 Main St, New York, NY 10001'),
(1, 'Downtown Plaza', '456 Broadway, New York, NY 10012'),
(2, 'Eastside Warehouse', '789 Industrial Pkwy, Boston, MA 02108'),
(3, 'Westside Mall', '101 Shopping Way, Los Angeles, CA 90024');

-- Seed parts
INSERT INTO parts (name, sku, unit_cost, stock_qty) VALUES
('HVAC Air Filter 20x20', 'PART-HVAC-FILT-01', 15.50, 50),
('Copper Pipe 1/2 inch 10ft', 'PART-PLUMB-PIPE-02', 22.00, 30),
('LED Troffer Light 2x4', 'PART-ELEC-LED-03', 45.00, 20),
('Thermostat Digital Programmable', 'PART-HVAC-THERM-04', 85.00, 10),
('Brass Ball Valve 1/2 inch', 'PART-PLUMB-VALV-05', 12.50, 40);

-- Seed initial work orders
INSERT INTO work_orders (code, title, description, priority, status, sla_due_at, customer_id, site_id, assigned_to_id, created_at, updated_at) VALUES
('WO-1001', 'AC Unit Blowing Warm Air', 'The AC unit on the 4th floor of the HQ Office Tower is blowing warm air. Please check refrigerant levels and compressor.', 'HIGH', 'IN_PROGRESS', '2026-07-12 16:00:00', 1, 1, 3, '2026-07-10 09:00:00', '2026-07-10 10:30:00'),
('WO-1002', 'Leaky Water Main Valve', 'Water is pooling around the main cutoff valve in the Eastside Warehouse basement. Need to replace the ball valve.', 'EMERGENCY', 'ASSIGNED', '2026-07-10 20:00:00', 2, 3, 4, '2026-07-10 11:30:00', '2026-07-10 11:30:00'),
('WO-1003', 'Flickering Lights in Office 12B', 'Fluorescent tubes or ballast need replacement in office room 12B at HQ Tower.', 'LOW', 'NEW', '2026-07-15 12:00:00', 1, 1, NULL, '2026-07-10 12:00:00', '2026-07-10 12:00:00'),
('WO-1004', 'Mall Exterior Signage Repair', 'The main entrance sign backlight is partially out. Might need replacement LED driver.', 'MEDIUM', 'COMPLETED', '2026-07-11 17:00:00', 3, 4, 3, '2026-07-09 08:00:00', '2026-07-09 15:30:00');

-- Seed work order status history
INSERT INTO work_order_status_history (work_order_id, from_status, to_status, changed_by_id, changed_at, note) VALUES
(1, 'NEW', 'ASSIGNED', 2, '2026-07-10 09:15:00', 'Assigned to Dave Tech.'),
(1, 'ASSIGNED', 'IN_PROGRESS', 3, '2026-07-10 10:30:00', 'Arrived at site, checking the rooftop unit.'),
(2, 'NEW', 'ASSIGNED', 2, '2026-07-10 11:45:00', 'Emergency dispatch to Mike.'),
(4, 'NEW', 'ASSIGNED', 2, '2026-07-09 08:15:00', 'Assigned to Dave.'),
(4, 'ASSIGNED', 'IN_PROGRESS', 3, '2026-07-09 09:00:00', 'Diagnosing driver issue.'),
(4, 'IN_PROGRESS', 'COMPLETED', 3, '2026-07-09 15:30:00', 'Installed new LED driver, signage now fully functional.');

-- Seed mock parts used
INSERT INTO part_usages (work_order_id, part_id, qty_used) VALUES
(4, 3, 1);

-- Seed mock time logs
INSERT INTO time_logs (work_order_id, technician_id, minutes, note, logged_at) VALUES
(1, 3, 90, 'Inspected electrical contacts, verified power supply is fine. Checked pressure.', '2026-07-10 10:30:00'),
(4, 3, 180, 'Traced wiring fault, replaced burnt out LED driver and tested.', '2026-07-09 15:30:00');
