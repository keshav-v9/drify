
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { 
  FileText, 
  Users, 
  Phone, 
  Mail, 
  Edit2, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  Plus
} from "lucide-react";
import { toast } from "sonner";

interface PlanningToolsProps {
  user: User | null;
}

interface LegalDocument {
  id: string;
  document_type: string;
  status: string;
  last_updated: string | null;
  notes: string | null;
}

interface SupportContact {
  id: string;
  contact_type: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
}

const PlanningTools = ({ user }: PlanningToolsProps) => {
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [contacts, setContacts] = useState<SupportContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDocument, setEditingDocument] = useState<LegalDocument | null>(null);
  const [editingContact, setEditingContact] = useState<SupportContact | null>(null);
  const [isDocumentDialogOpen, setIsDocumentDialogOpen] = useState(false);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);

  const [documentForm, setDocumentForm] = useState({
    document_type: '',
    status: 'pending',
    notes: ''
  });

  const [contactForm, setContactForm] = useState({
    contact_type: '',
    name: '',
    phone: '',
    email: '',
    notes: ''
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch legal documents
      const { data: docData, error: docError } = await supabase
        .from('legal_documents')
        .select('*')
        .order('created_at', { ascending: true });

      if (docError) throw docError;

      // Fetch support contacts
      const { data: contactData, error: contactError } = await supabase
        .from('support_contacts')
        .select('*')
        .order('created_at', { ascending: true });

      if (contactError) throw contactError;

      // Create defaults if none exist
      if (!docData || docData.length === 0) {
        await createDefaultDocuments();
      } else {
        setDocuments(docData);
      }

      if (!contactData || contactData.length === 0) {
        await createDefaultContacts();
      } else {
        setContacts(contactData);
      }
    } catch (error) {
      console.error('Error fetching planning data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultDocuments = async () => {
    const defaultDocs = [
      { document_type: 'Power of Attorney', status: 'pending', user_id: user?.id },
      { document_type: 'Healthcare Directive', status: 'pending', user_id: user?.id },
      { document_type: 'Will & Testament', status: 'pending', user_id: user?.id }
    ];

    try {
      const { data, error } = await supabase
        .from('legal_documents')
        .insert(defaultDocs)
        .select();

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error creating default documents:', error);
    }
  };

  const createDefaultContacts = async () => {
    const defaultContacts = [
      { contact_type: 'Financial Advisor', user_id: user?.id },
      { contact_type: 'Elder Law Attorney', user_id: user?.id },
      { contact_type: 'Care Coordinator', user_id: user?.id }
    ];

    try {
      const { data, error } = await supabase
        .from('support_contacts')
        .insert(defaultContacts)
        .select();

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error creating default contacts:', error);
    }
  };

  const handleDocumentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const docData = {
        ...documentForm,
        last_updated: new Date().toISOString().split('T')[0],
        user_id: user.id
      };

      if (editingDocument) {
        const { error } = await supabase
          .from('legal_documents')
          .update(docData)
          .eq('id', editingDocument.id);

        if (error) throw error;
        toast.success('Document updated');
      } else {
        const { error } = await supabase
          .from('legal_documents')
          .insert([docData]);

        if (error) throw error;
        toast.success('Document added');
      }

      fetchData();
      resetDocumentForm();
    } catch (error) {
      console.error('Error saving document:', error);
      toast.error('Failed to save document');
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const contactData = {
        ...contactForm,
        user_id: user.id
      };

      if (editingContact) {
        const { error } = await supabase
          .from('support_contacts')
          .update(contactData)
          .eq('id', editingContact.id);

        if (error) throw error;
        toast.success('Contact updated');
      } else {
        const { error } = await supabase
          .from('support_contacts')
          .insert([contactData]);

        if (error) throw error;
        toast.success('Contact added');
      }

      fetchData();
      resetContactForm();
    } catch (error) {
      console.error('Error saving contact:', error);
      toast.error('Failed to save contact');
    }
  };

  const resetDocumentForm = () => {
    setDocumentForm({ document_type: '', status: 'pending', notes: '' });
    setEditingDocument(null);
    setIsDocumentDialogOpen(false);
  };

  const resetContactForm = () => {
    setContactForm({ contact_type: '', name: '', phone: '', email: '', notes: '' });
    setEditingContact(null);
    setIsContactDialogOpen(false);
  };

  const startEditDocument = (doc: LegalDocument) => {
    setEditingDocument(doc);
    setDocumentForm({
      document_type: doc.document_type,
      status: doc.status,
      notes: doc.notes || ''
    });
    setIsDocumentDialogOpen(true);
  };

  const startEditContact = (contact: SupportContact) => {
    setEditingContact(contact);
    setContactForm({
      contact_type: contact.contact_type,
      name: contact.name || '',
      phone: contact.phone || '',
      email: contact.email || '',
      notes: contact.notes || ''
    });
    setIsContactDialogOpen(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>;
      default:
        return <Badge variant="destructive">Pending</Badge>;
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading planning tools...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Financial Planning Tools</h2>
        <p className="text-gray-600">Manage legal documents and support network contacts</p>
      </div>

      {/* Legal Documents */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Legal Document Tracking</span>
          </CardTitle>
          <Dialog open={isDocumentDialogOpen} onOpenChange={setIsDocumentDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetDocumentForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingDocument ? 'Edit Legal Document' : 'Add Legal Document'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleDocumentSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="doc-type">Document Type</Label>
                  <Input
                    id="doc-type"
                    value={documentForm.document_type}
                    onChange={(e) => setDocumentForm(prev => ({ ...prev, document_type: e.target.value }))}
                    placeholder="e.g., Power of Attorney"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="doc-status">Status</Label>
                  <Select
                    value={documentForm.status}
                    onValueChange={(value) => setDocumentForm(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="doc-notes">Notes</Label>
                  <Textarea
                    id="doc-notes"
                    value={documentForm.notes}
                    onChange={(e) => setDocumentForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes or details"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={resetDocumentForm}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingDocument ? 'Update' : 'Add'} Document
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  {getStatusIcon(doc.status)}
                  <div>
                    <h4 className="font-medium">{doc.document_type}</h4>
                    {doc.last_updated && (
                      <p className="text-sm text-gray-600">
                        Last updated: {new Date(doc.last_updated).toLocaleDateString()}
                      </p>
                    )}
                    {doc.notes && (
                      <p className="text-sm text-gray-600 mt-1">{doc.notes}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(doc.status)}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEditDocument(doc)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Support Network */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Support Network</span>
          </CardTitle>
          <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetContactForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingContact ? 'Edit Support Contact' : 'Add Support Contact'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="contact-type">Contact Type</Label>
                  <Input
                    id="contact-type"
                    value={contactForm.contact_type}
                    onChange={(e) => setContactForm(prev => ({ ...prev, contact_type: e.target.value }))}
                    placeholder="e.g., Financial Advisor"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="contact-name">Name</Label>
                  <Input
                    id="contact-name"
                    value={contactForm.name}
                    onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Contact person's name"
                  />
                </div>
                <div>
                  <Label htmlFor="contact-phone">Phone</Label>
                  <Input
                    id="contact-phone"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <Label htmlFor="contact-email">Email</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Email address"
                  />
                </div>
                <div>
                  <Label htmlFor="contact-notes">Notes</Label>
                  <Textarea
                    id="contact-notes"
                    value={contactForm.notes}
                    onChange={(e) => setContactForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={resetContactForm}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingContact ? 'Update' : 'Add'} Contact
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {contacts.map((contact) => (
              <div key={contact.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{contact.contact_type}</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEditContact(contact)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
                {contact.name && (
                  <p className="text-gray-600 mb-1">{contact.name}</p>
                )}
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  {contact.phone && (
                    <div className="flex items-center space-x-1">
                      <Phone className="h-4 w-4" />
                      <span>{contact.phone}</span>
                    </div>
                  )}
                  {contact.email && (
                    <div className="flex items-center space-x-1">
                      <Mail className="h-4 w-4" />
                      <span>{contact.email}</span>
                    </div>
                  )}
                </div>
                {contact.notes && (
                  <p className="text-sm text-gray-600 mt-2">{contact.notes}</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Financial Planning Insights */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle>Financial Planning Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <p className="text-gray-700">
                Ensure your Power of Attorney includes specific financial powers for care decisions.
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <p className="text-gray-700">
                Review and update your Healthcare Directive to reflect current care preferences.
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <p className="text-gray-700">
                Maintain regular contact with your support network to ensure continuity of care.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlanningTools;
