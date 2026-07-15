import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getBooks, 
  addBook, 
  getIssuedBooks, 
  issueBook, 
  returnBook, 
  getSubCollection,
  subscribeToBooks,
  subscribeToIssuedBooks,
  subscribeToSubCollection
} from '../../firebase/firestore';
import { LuBook as Book, LuPlus as Plus, LuX as X, LuSearch as Search, LuCircleCheck as CheckCircle2, LuCircleAlert as AlertCircle, LuLibrary as Library, LuUndo2 as Undo2, LuUsers as Users } from 'react-icons/lu';
import toast from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal';

const mockStudents = [
  { id: 's1', name: 'Alice Smith', email: 'alice@example.com' },
  { id: 's2', name: 'Bob Johnson', email: 'bob@example.com' },
  { id: 's3', name: 'Charlie Davis', email: 'charlie@example.com' },
  { id: 's4', name: 'Diana Prince', email: 'diana@example.com' },
  { id: 's5', name: 'Evan Wright', email: 'evan@example.com' },
  { id: 's6', name: 'Fiona Gallagher', email: 'fiona@example.com' },
  { id: 's7', name: 'George Miller', email: 'george@example.com' },
  { id: 's8', name: 'Hannah Abbott', email: 'hannah@example.com' },
  { id: 's9', name: 'Ian Malcolm', email: 'ian@example.com' },
  { id: 's10', name: 'Julia Roberts', email: 'julia@example.com' }
];

const mockBooks = [
  { id: 'm1', title: 'To Kill a Mockingbird', author: 'Harper Lee', category: 'Fiction', isbn: '978-0060935467', quantity: 5, available: 5 },
  { id: 'm2', title: '1984', author: 'George Orwell', category: 'Fiction', isbn: '978-0451524935', quantity: 3, available: 3 },
  { id: 'm3', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', category: 'Fiction', isbn: '978-0743273565', quantity: 4, available: 4 },
  { id: 'm4', title: 'A Brief History of Time', author: 'Stephen Hawking', category: 'Science', isbn: '978-0553380163', quantity: 2, available: 2 },
  { id: 'm5', title: 'The Catcher in the Rye', author: 'J.D. Salinger', category: 'Fiction', isbn: '978-0316769488', quantity: 6, available: 6 },
  { id: 'm6', title: 'Pride and Prejudice', author: 'Jane Austen', category: 'Fiction', isbn: '978-0141439518', quantity: 3, available: 3 },
  { id: 'm7', title: 'Introduction to Algorithms', author: 'Thomas H. Cormen', category: 'Computer Science', isbn: '978-0262033848', quantity: 2, available: 2 },
  { id: 'm8', title: 'The Hobbit', author: 'J.R.R. Tolkien', category: 'Fantasy', isbn: '978-0547928227', quantity: 4, available: 4 },
  { id: 'm9', title: 'Principles of Physics', author: 'David Halliday', category: 'Science', isbn: '978-1118230725', quantity: 5, available: 5 },
  { id: 'm10', title: 'Sapiens', author: 'Yuval Noah Harari', category: 'History', isbn: '978-0062316097', quantity: 3, available: 3 },
];

export default function LibraryManagement() {
  const { userProfile } = useAuth();
  const schoolId = userProfile?.schoolId;

  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'issued'
  const [books, setBooks] = useState([]);
  const [issuedBooks, setIssuedBooks] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search/Filter
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [confirmModalState, setConfirmModalState] = useState({ isOpen: false, issueId: null, bookId: null });
  
  // Forms
  const [addingBook, setAddingBook] = useState(false);
  const [newBook, setNewBook] = useState({
    title: '', author: '', isbn: '', category: '', totalQuantity: 1
  });

  const [issuingBook, setIssuingBook] = useState(false);
  const [issueData, setIssueData] = useState({
    bookId: '', studentId: '', dueDate: ''
  });

  useEffect(() => {
    if (!schoolId) return;

    setLoading(true);
    let booksUnsub, issuedBooksUnsub, studentsUnsub;

    booksUnsub = subscribeToBooks(schoolId, (data) => {
      setBooks(data.length > 0 ? data : mockBooks);
      setLoading(false);
    });

    issuedBooksUnsub = subscribeToIssuedBooks(schoolId, (data) => {
      setIssuedBooks(data);
    });

    studentsUnsub = subscribeToSubCollection(schoolId, 'users', (data) => {
      setStudents(data.length > 0 ? data : mockStudents);
    });

    return () => {
      if (booksUnsub) booksUnsub();
      if (issuedBooksUnsub) issuedBooksUnsub();
      if (studentsUnsub) studentsUnsub();
    };
  }, [schoolId]);

  const handleAddBook = async (e) => {
    e.preventDefault();
    setAddingBook(true);
    try {
      await addBook(schoolId, {
        ...newBook,
        totalQuantity: Number(newBook.totalQuantity)
      });
      // Listner handles updates
      setShowAddModal(false);
      setNewBook({ title: '', author: '', isbn: '', category: '', totalQuantity: 1 });
    } catch (error) {
      toast.error("Failed to add book");
    } finally {
      setAddingBook(false);
    }
  };

  const handleIssueBook = async (e) => {
    e.preventDefault();
    if (!issueData.bookId || !issueData.studentId || !issueData.dueDate) return;
    
    // Check if available
    const book = books.find(b => b.id === issueData.bookId);
    if (!book || book.availableQuantity <= 0) {
      toast.error("This book is out of stock!");
      return;
    }

    setIssuingBook(true);
    try {
      await issueBook(schoolId, issueData.bookId, issueData.studentId, new Date(issueData.dueDate).toISOString());
      // Listener handles updates
      setShowIssueModal(false);
      setIssueData({ bookId: '', studentId: '', dueDate: '' });
      setActiveTab('issued');
    } catch (error) {
      toast.error("Failed to issue book");
    } finally {
      setIssuingBook(false);
    }
  };

  const handleReturnBookClick = (issueId, bookId) => {
    setConfirmModalState({ isOpen: true, issueId, bookId });
  };

  const executeReturnBook = async () => {
    const { issueId, bookId } = confirmModalState;
    if (!issueId || !bookId) return;
    try {
      await returnBook(schoolId, issueId, bookId);
      // Listener handles updates
    } catch (error) {
      toast.error("Failed to return book");
    } finally {
      setConfirmModalState({ isOpen: false, issueId: null, bookId: null });
    }
  };

  const getStudentName = (studentId) => {
    const s = students.find(s => s.id === studentId);
    return s ? `${s.firstName} ${s.lastName} (${s.admissionNumber})` : 'Unknown Student';
  };

  const getBookTitle = (bookId) => {
    const b = books.find(b => b.id === bookId);
    return b ? b.title : 'Unknown Book';
  };

  const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date();
  };

  // Filtered Lists
  const filteredBooks = books.filter(b => 
    b.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    b.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.isbn.includes(searchTerm)
  );

  const filteredIssued = issuedBooks.filter(issue => 
    getBookTitle(issue.bookId).toLowerCase().includes(searchTerm.toLowerCase()) ||
    getStudentName(issue.studentId).toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto pb-24">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Library Management</h1>
          <p className="text-slate-500 mt-1">Manage book inventory, issuing, and returns.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowIssueModal(true)}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 shadow-sm flex items-center gap-2 transition-colors"
          >
            <Library size={18} /> Issue Book
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 shadow-sm flex items-center gap-2 transition-colors"
          >
            <Plus size={18} /> Add New Book
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col min-h-[500px]">
        {/* Header Tabs & Search */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50 rounded-t-3xl">
          <div className="flex gap-2 p-1 bg-slate-200/50 rounded-xl">
            <button 
              onClick={() => setActiveTab('inventory')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'inventory' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Book Inventory ({books.length})
            </button>
            <button 
              onClick={() => setActiveTab('issued')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'issued' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Issued Logs ({issuedBooks.filter(i => i.status === 'issued').length})
            </button>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search books or students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 text-sm"
            />
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-x-auto">
          {activeTab === 'inventory' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-sm">
                  <th className="p-4 font-semibold w-2/5">Book Details</th>
                  <th className="p-4 font-semibold">Category</th>
                  <th className="p-4 font-semibold">ISBN</th>
                  <th className="p-4 font-semibold text-right">Availability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBooks.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-12 text-center text-slate-500">No books found.</td>
                  </tr>
                ) : (
                  filteredBooks.map(book => {
                    const isEmpty = book.availableQuantity === 0;
                    const percentage = (book.availableQuantity / book.totalQuantity) * 100;
                    return (
                      <tr key={book.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center shrink-0">
                              <Book size={20} />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{book.title}</div>
                              <div className="text-xs text-slate-500 mt-0.5">by {book.author}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-wider">
                            {book.category}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-sm text-slate-500">{book.isbn}</td>
                        <td className="p-4">
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-bold ${isEmpty ? 'text-red-500' : 'text-slate-900'}`}>
                                {book.availableQuantity} / {book.totalQuantity}
                              </span>
                            </div>
                            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${isEmpty ? 'bg-red-500' : percentage > 50 ? 'bg-green-500' : 'bg-amber-500'}`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-sm">
                  <th className="p-4 font-semibold w-1/3">Book</th>
                  <th className="p-4 font-semibold w-1/3">Issued To</th>
                  <th className="p-4 font-semibold">Due Date</th>
                  <th className="p-4 font-semibold text-right">Status / Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredIssued.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-12 text-center text-slate-500">No issued logs found.</td>
                  </tr>
                ) : (
                  filteredIssued.map(issue => {
                    const overdue = issue.status === 'issued' && isOverdue(issue.dueDate);
                    return (
                      <tr key={issue.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-bold text-slate-900">
                          {getBookTitle(issue.bookId)}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                            <Users size={14} className="text-slate-400" />
                            {getStudentName(issue.studentId)}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className={`flex items-center gap-1.5 text-sm font-medium ${overdue ? 'text-red-600' : 'text-slate-600'}`}>
                            {overdue && <AlertCircle size={14} />}
                            {new Date(issue.dueDate).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          {issue.status === 'returned' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-lg">
                              <CheckCircle2 size={14} /> Returned
                            </span>
                          ) : (
                            <button 
                              onClick={() => handleReturnBookClick(issue.id, issue.bookId)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-lg transition-colors inline-flex items-center gap-1.5"
                            >
                              <Undo2 size={14} /> Mark Returned
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Book Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Book className="text-primary-600" /> Catalog New Book
              </h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddBook} className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
              <div className="p-6 space-y-6 flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Book Title</label>
                    <input 
                      type="text" required
                      value={newBook.title}
                      onChange={(e) => setNewBook({...newBook, title: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Author</label>
                    <input 
                      type="text" required
                      value={newBook.author}
                      onChange={(e) => setNewBook({...newBook, author: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">ISBN</label>
                    <input 
                      type="text" required
                      value={newBook.isbn}
                      onChange={(e) => setNewBook({...newBook, isbn: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Category</label>
                    <select 
                      required
                      value={newBook.category}
                      onChange={(e) => setNewBook({...newBook, category: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                    >
                      <option value="">Select...</option>
                      <option value="Science">Science</option>
                      <option value="Fiction">Fiction</option>
                      <option value="History">History</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="Reference">Reference</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Total Copies</label>
                  <input 
                    type="number" min="1" required
                    value={newBook.totalQuantity}
                    onChange={(e) => setNewBook({...newBook, totalQuantity: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                  />
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={addingBook} className="px-6 py-2.5 bg-primary-600 text-white font-bold hover:bg-primary-700 rounded-xl shadow-sm transition-colors">
                  {addingBook ? 'Saving...' : 'Save Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Issue Book Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Library className="text-primary-600" /> Issue Book
              </h2>
              <button onClick={() => setShowIssueModal(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleIssueBook} className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
              <div className="p-6 space-y-6 flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Select Book</label>
                  <select 
                    required
                    value={issueData.bookId}
                    onChange={(e) => setIssueData({...issueData, bookId: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    <option value="">Choose an available book...</option>
                    {books.filter(b => b.availableQuantity > 0).map(b => (
                      <option key={b.id} value={b.id}>
                        {b.title} (Available: {b.availableQuantity})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Select Student</label>
                  <select 
                    required
                    value={issueData.studentId}
                    onChange={(e) => setIssueData({...issueData, studentId: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    <option value="">Choose a student...</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.firstName} {s.lastName} ({s.admissionNumber})
                      </option>
                    ))}
                  </select>
                </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Due Date</label>
                  <input 
                    type="date" required
                    value={issueData.dueDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setIssueData({...issueData, dueDate: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white"
                  />
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                <button type="button" onClick={() => setShowIssueModal(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={issuingBook} className="px-6 py-2.5 bg-primary-600 text-white font-bold hover:bg-primary-700 rounded-xl shadow-sm transition-colors">
                  {issuingBook ? 'Processing...' : 'Issue Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState({ isOpen: false, issueId: null, bookId: null })}
        onConfirm={executeReturnBook}
        title="Return Book"
        message="Mark this book as returned? This will update the inventory and the student's record."
        confirmText="Confirm"
        type="info"
      />
    </div>
  );
}
